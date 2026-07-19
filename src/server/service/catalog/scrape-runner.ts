import "server-only";

import { closeBrowser, getVendorScraper } from "@scripts/catalog/lib/registry";
import type { ScrapedProduct } from "@scripts/catalog/lib/types";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapedProducts, scrapeJobs } from "@/db/schemas/scrape.schema";
import { logger } from "@/lib/logger";

/*
 * DETACHED scrape runner. The scrape runs as an in-process background task — NOT tied to any HTTP
 * request — so refreshing or leaving the admin page never stops it. Progress lives entirely in the
 * DB (`scrape_jobs` = counters/status, `scraped_products` = checkpointed rows), which the UI polls.
 *
 * No queue/broker (BullMQ/Redis) — this is a single-operator LOCAL tool; the DB is the source of
 * truth and every product is checkpointed as it's found, so nothing is lost on a server restart
 * (just resume). One run per vendor at a time, tracked in a module-level Map of AbortControllers so
 * Stop can abort it.
 */

/** Active runs, keyed by vendor slug. Presence ⇒ a scrape is currently in flight. */
const active = new Map<string, { controller: AbortController; startedAt: number }>();

export function isRunning(vendor: string): boolean {
  return active.has(vendor);
}

/** Signal a running scrape to stop (graceful — the loop halts between products). */
export function stopRun(vendor: string): boolean {
  const run = active.get(vendor);
  if (!run) return false;
  run.controller.abort();
  return true;
}

export interface StartResult {
  ok: boolean;
  reason?: "already_running" | "unknown_vendor";
}

/**
 * Start a detached scrape for `vendor`. Returns immediately; the work runs in the background.
 * `fresh` re-scrapes everything (ignores the resume skip-set, upserts to refresh prices).
 */
export function startRun(vendor: string, fresh: boolean): StartResult {
  if (active.has(vendor)) return { ok: false, reason: "already_running" };
  const scraper = getVendorScraper(vendor);
  if (!scraper) return { ok: false, reason: "unknown_vendor" };

  const controller = new AbortController();
  active.set(vendor, { controller, startedAt: Date.now() });

  // Fire-and-forget: run the scrape without awaiting so the caller returns instantly.
  void runScrape(vendor, fresh, controller.signal).finally(() => active.delete(vendor));

  return { ok: true };
}

/** The actual background scrape — mirrors the old SSE handler, minus the stream (DB is the sink). */
async function runScrape(vendor: string, fresh: boolean, signal: AbortSignal): Promise<void> {
  const scraper = getVendorScraper(vendor);
  if (!scraper) return;

  // Reconcile stuck jobs: a prior `running` row for this vendor is an orphan (a crash left it).
  await db
    .update(scrapeJobs)
    .set({
      status: "interrupted",
      error: "orphaned — superseded by a new run",
      finishedAt: new Date().toISOString(),
    })
    .where(and(eq(scrapeJobs.vendor, vendor), eq(scrapeJobs.status, "running")));

  const [job] = await db
    .insert(scrapeJobs)
    .values({ vendor, status: "running" })
    .returning({ id: scrapeJobs.id });
  const jobId = job?.id;

  // Resume: skip already-staged URLs — unless `fresh`, where every URL is re-fetched (upserted).
  const skipUrls = new Set<string>();
  if (!fresh) {
    const existing = await db
      .select({ sourceUrl: scrapedProducts.sourceUrl })
      .from(scrapedProducts)
      .where(eq(scrapedProducts.vendor, vendor));
    for (const r of existing) skipUrls.add(r.sourceUrl);
  }

  try {
    await scraper.scrape({
      signal,
      skipUrls,
      onUrls: async (total) => {
        if (jobId)
          await db.update(scrapeJobs).set({ totalUrls: total }).where(eq(scrapeJobs.id, jobId));
      },
      onProduct: async (product: ScrapedProduct) => {
        await checkpoint(vendor, product);
        if (jobId)
          await db
            .update(scrapeJobs)
            .set({ doneUrls: sql`${scrapeJobs.doneUrls} + 1` })
            .where(eq(scrapeJobs.id, jobId));
      },
      onFailed: async () => {
        if (jobId)
          await db
            .update(scrapeJobs)
            .set({ failedUrls: sql`${scrapeJobs.failedUrls} + 1` })
            .where(eq(scrapeJobs.id, jobId));
      },
    });

    const status = signal.aborted ? "cancelled" : "done";
    if (jobId)
      await db
        .update(scrapeJobs)
        .set({ status, finishedAt: new Date().toISOString() })
        .where(eq(scrapeJobs.id, jobId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, vendor }, "scrape failed");
    if (jobId)
      await db
        .update(scrapeJobs)
        .set({ status: "interrupted", error: message, finishedAt: new Date().toISOString() })
        .where(eq(scrapeJobs.id, jobId));
  } finally {
    if (scraper.usesBrowser) await closeBrowser().catch(() => {});
  }
}

/** Upsert one scraped product into the staging table (checkpoint), keyed by (vendor, url). */
async function checkpoint(vendor: string, p: ScrapedProduct): Promise<void> {
  const now = new Date().toISOString();
  const set = {
    name: p.name,
    priceBdt: p.priceBdt ?? null,
    category: p.category ?? null,
    imageUrl: p.imageUrl ?? null,
    dimensions: p.dimensions ?? null,
    scrapedAt: now,
  };
  await db
    .insert(scrapedProducts)
    .values({ vendor, sourceUrl: p.sourceUrl, ...set })
    .onConflictDoUpdate({
      target: [scrapedProducts.vendor, scrapedProducts.sourceUrl],
      set,
    });
}
