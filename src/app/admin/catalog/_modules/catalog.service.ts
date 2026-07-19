import "server-only";

import { ensureVendor, ingestProducts, loadCategoryMap } from "@scripts/catalog/lib/ingest";
import { getVendorScraper, listVendorScrapers } from "@scripts/catalog/lib/registry";
import type { ScrapedProduct } from "@scripts/catalog/lib/types";
import { desc, eq } from "drizzle-orm";
import { CategoryService } from "@/app/admin/categories/_modules/category.service";
import { db } from "@/db/client";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { scrapedProducts, scrapeJobs } from "@/db/schemas/scrape.schema";
import { isRunning, startRun, stopRun } from "@/server/service/catalog/scrape-runner";

/*
 * Admin catalog-scraping service — all Drizzle + orchestration for the /admin/catalog tool.
 * The SSE route (a route handler) owns the live streaming loop; everything with a database
 * touch or reuse of the ingest lib lives here. No auth/cache here — the router/route guards.
 *
 * Staging (`scraped_products`) is deliberately separate from `furniture_items`: a scrape
 * checkpoints here, and only an explicit ingest promotes staged rows into the live catalog.
 */
export const CatalogService = {
  /** Vendors from the scraper registry, each with its staged + ingested counts. */
  vendors: async () => {
    const registry = listVendorScrapers();
    const staged = await db.select({ vendor: scrapedProducts.vendor }).from(scrapedProducts);
    const stagedCounts = countBy(staged.map((r) => r.vendor));

    // Ingested count is by brand name (furniture_items.brand), matching how ingest tags rows.
    const ingested = await db
      .select({ brand: furnitureItems.brand })
      .from(furnitureItems)
      .where(eq(furnitureItems.source, "brand"));
    const ingestedCounts = countBy(ingested.map((r) => r.brand ?? ""));

    return registry.map((v) => ({
      slug: v.slug,
      name: v.name,
      usesBrowser: v.usesBrowser,
      staged: stagedCounts.get(v.slug) ?? 0,
      ingested: ingestedCounts.get(v.name) ?? 0,
    }));
  },

  /** Staged (scraped) rows for one vendor, newest first. */
  staged: (vendor: string) =>
    db
      .select()
      .from(scrapedProducts)
      .where(eq(scrapedProducts.vendor, vendor))
      .orderBy(desc(scrapedProducts.scrapedAt)),

  /** Recent scrape jobs for one vendor (history + resume affordance), newest first. */
  jobs: (vendor: string) =>
    db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.vendor, vendor))
      .orderBy(desc(scrapeJobs.startedAt))
      .limit(10),

  /**
   * Live run status for one vendor — what the UI POLLS. Returns the newest job (its status +
   * done/total/failed counters), whether a run is currently in flight in THIS process, and the
   * newest staged products for the live table. Because it reads the DB, a page refresh mid-run
   * simply re-polls and picks up wherever the detached run is.
   */
  runStatus: async (vendor: string) => {
    const [job] = await db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.vendor, vendor))
      .orderBy(desc(scrapeJobs.startedAt))
      .limit(1);
    const products = await db
      .select()
      .from(scrapedProducts)
      .where(eq(scrapedProducts.vendor, vendor))
      .orderBy(desc(scrapedProducts.scrapedAt))
      .limit(60);
    return { job: job ?? null, running: isRunning(vendor), products };
  },

  /** Start a detached scrape (returns immediately; runs in the background). `fresh` re-scrapes all. */
  startScrape: (vendor: string, fresh: boolean) => startRun(vendor, fresh),

  /** Signal the running scrape for a vendor to stop. Returns whether one was actually running. */
  stopScrape: (vendor: string) => ({ stopped: stopRun(vendor) }),

  /**
   * Diff staged rows against the live catalog, keyed by URL (scraped_products.sourceUrl ↔
   * furniture_items.productUrl):
   *   new     — staged, not yet in the catalog
   *   changed — in both, but the price differs
   *   removed — in the catalog for this vendor, but no longer staged (gone from the site)
   *   same    — in both, unchanged
   */
  diff: async (vendor: string) => {
    const scraper = getVendorScraper(vendor);
    const brand = scraper?.name ?? vendor;

    const staged = await db
      .select({
        sourceUrl: scrapedProducts.sourceUrl,
        name: scrapedProducts.name,
        priceBdt: scrapedProducts.priceBdt,
      })
      .from(scrapedProducts)
      .where(eq(scrapedProducts.vendor, vendor));

    const live = await db
      .select({
        productUrl: furnitureItems.productUrl,
        name: furnitureItems.name,
        priceBdt: furnitureItems.priceBdt,
      })
      .from(furnitureItems)
      .where(eq(furnitureItems.brand, brand));

    const liveByUrl = new Map(live.filter((r) => r.productUrl).map((r) => [r.productUrl, r]));
    const stagedUrls = new Set(staged.map((s) => s.sourceUrl));

    const created: DiffRow[] = [];
    const changed: DiffRow[] = [];
    let same = 0;

    for (const s of staged) {
      const match = liveByUrl.get(s.sourceUrl);
      if (!match) {
        created.push({ url: s.sourceUrl, name: s.name, oldPrice: null, newPrice: s.priceBdt });
      } else if (match.priceBdt !== s.priceBdt) {
        changed.push({
          url: s.sourceUrl,
          name: s.name,
          oldPrice: match.priceBdt,
          newPrice: s.priceBdt,
        });
      } else {
        same++;
      }
    }

    const removed: DiffRow[] = live
      .filter((r) => r.productUrl && !stagedUrls.has(r.productUrl))
      .map((r) => ({
        url: r.productUrl ?? "",
        name: r.name,
        oldPrice: r.priceBdt,
        newPrice: null,
      }));

    return { created, changed, removed, same };
  },

  /**
   * Ingest a vendor's STAGED rows into the live catalog. Reuses the same ingest lib as the
   * CLI (ensureVendor → AI-map new categories PENDING → resolve APPROVED maps → upsert), but
   * reads products from `scraped_products` instead of the JSON file. Returns the counts.
   */
  ingestVendor: async (vendor: string) => {
    const scraper = getVendorScraper(vendor);
    if (!scraper) throw new Error(`unknown vendor: ${vendor}`);

    const rows = await db.select().from(scrapedProducts).where(eq(scrapedProducts.vendor, vendor));
    if (rows.length === 0)
      return { inserted: 0, updated: 0, unmatched: 0, mapped: 0, newCategories: 0 };

    const products: ScrapedProduct[] = rows.map((r) => ({
      vendor,
      name: r.name,
      priceBdt: r.priceBdt,
      currency: "BDT",
      category: r.category,
      dimensions: r.dimensions,
      sourceUrl: r.sourceUrl,
      imageUrl: r.imageUrl,
      imageFile: null,
    }));

    const vendorId = await ensureVendor(scraper.name);

    // AI-map any raw categories not yet mapped (writes PENDING for admin review).
    const rawCategories = [
      ...new Set(products.map((p) => p.category).filter((c): c is string => !!c)),
    ];
    const map = await CategoryService.mapVendorCategories(vendorId, rawCategories);

    const categoryMap = await loadCategoryMap(vendorId);
    const result = await ingestProducts(vendorId, scraper.name, products, categoryMap);
    return { ...result, mapped: map.mapped, newCategories: map.newCategories };
  },
};

interface DiffRow {
  url: string;
  name: string;
  oldPrice: number | null;
  newPrice: number | null;
}

/** Count occurrences of each string key. */
function countBy(values: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}
