import { closeBrowser, getVendorScraper } from "@scripts/catalog/lib/registry";
import type { ScrapedProduct } from "@scripts/catalog/lib/types";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapedProducts, scrapeJobs } from "@/db/schemas/scrape.schema";
import { isAdmin } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isLocal } from "@/server/rpc/local-only";

/*
 * Live scrape stream (SSE) — the local-operator catalog scraper. Runs the vendor's adapter
 * in THIS process (only works in local dev — Playwright can't run on serverless), checkpoints
 * every product into `scraped_products` the moment it's found, and streams progress events to
 * the admin UI.
 *
 * Resilience: because each product is persisted as it arrives, a crash / Stop / network drop
 * leaves the done set safe. Resume = re-run; already-staged sourceUrls are skipped. Stop = the
 * client closes the EventSource → request.signal aborts → the loop halts and the job is marked
 * `cancelled` (done rows kept).
 *
 * GET /api/admin/scrape/<vendor>  → text/event-stream of:
 *   {type:"start", total}                  once the URL list is known
 *   {type:"product", done, total, product} per product
 *   {type:"failed", url, done, total}      per skipped URL
 *   {type:"done" | "cancelled" | "error", inserted, failed, message?}
 */

export const dynamic = "force-dynamic";
export const maxDuration = 3600; // local dev has no real cap; declared for clarity

export async function GET(request: Request, { params }: { params: Promise<{ vendor: string }> }) {
  // Guard: local-only + admin.
  if (!isLocal()) {
    return new Response("Scraping is only available in local development.", { status: 403 });
  }
  if (!(await isAdmin())) {
    return new Response("Forbidden", { status: 403 });
  }

  const { vendor } = await params;
  const scraper = getVendorScraper(vendor);
  if (!scraper) {
    return new Response(`Unknown vendor: ${vendor}`, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Create the job row (running).
      const [job] = await db
        .insert(scrapeJobs)
        .values({ vendor, status: "running" })
        .returning({ id: scrapeJobs.id });
      const jobId = job?.id;

      // Resume: skip URLs already staged for this vendor.
      const existing = await db
        .select({ sourceUrl: scrapedProducts.sourceUrl })
        .from(scrapedProducts)
        .where(eq(scrapedProducts.vendor, vendor));
      const skipUrls = new Set(existing.map((r) => r.sourceUrl));

      let done = 0;
      let failed = 0;

      try {
        await scraper.scrape({
          signal: request.signal,
          skipUrls,
          onUrls: async (total) => {
            if (jobId)
              await db.update(scrapeJobs).set({ totalUrls: total }).where(eq(scrapeJobs.id, jobId));
            send({ type: "start", total, skipped: skipUrls.size });
          },
          onProduct: async (product: ScrapedProduct, _i, total) => {
            await checkpoint(vendor, product);
            done++;
            if (jobId) {
              await db
                .update(scrapeJobs)
                .set({ doneUrls: sql`${scrapeJobs.doneUrls} + 1` })
                .where(eq(scrapeJobs.id, jobId));
            }
            send({ type: "product", done, total, product });
          },
          onFailed: async (url, _error) => {
            failed++;
            if (jobId) {
              await db
                .update(scrapeJobs)
                .set({ failedUrls: sql`${scrapeJobs.failedUrls} + 1` })
                .where(eq(scrapeJobs.id, jobId));
            }
            send({ type: "failed", url, done, failed });
          },
        });

        const cancelled = request.signal.aborted;
        const status = cancelled ? "cancelled" : "done";
        if (jobId) {
          await db
            .update(scrapeJobs)
            .set({ status, finishedAt: new Date().toISOString() })
            .where(eq(scrapeJobs.id, jobId));
        }
        send({ type: status, inserted: done, failed });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error({ err, vendor }, "scrape failed");
        if (jobId) {
          await db
            .update(scrapeJobs)
            .set({ status: "interrupted", error: message, finishedAt: new Date().toISOString() })
            .where(eq(scrapeJobs.id, jobId));
        }
        send({ type: "error", inserted: done, failed, message });
      } finally {
        // Close the shared browser (no-op for HTTP-only vendors) and end the stream.
        if (scraper.usesBrowser) await closeBrowser().catch(() => {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

/** Upsert one scraped product into the staging table (checkpoint), keyed by (vendor, url). */
async function checkpoint(vendor: string, p: ScrapedProduct): Promise<void> {
  await db
    .insert(scrapedProducts)
    .values({
      vendor,
      sourceUrl: p.sourceUrl,
      name: p.name,
      priceBdt: p.priceBdt ?? null,
      category: p.category ?? null,
      imageUrl: p.imageUrl ?? null,
      dimensions: p.dimensions ?? null,
      scrapedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [scrapedProducts.vendor, scrapedProducts.sourceUrl],
      set: {
        name: p.name,
        priceBdt: p.priceBdt ?? null,
        category: p.category ?? null,
        imageUrl: p.imageUrl ?? null,
        dimensions: p.dimensions ?? null,
        scrapedAt: new Date().toISOString(),
      },
    });
}
