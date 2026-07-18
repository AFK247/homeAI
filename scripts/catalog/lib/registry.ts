import { closeBrowser } from "./browser";
import type { ScrapedProduct, ScrapeOptions } from "./types";
import { scrapeBrothers } from "../vendors/brothers";
import { scrapeHatil } from "../vendors/hatil";
import { scrapeHatim } from "../vendors/hatim";
import { scrapeNavana } from "../vendors/navana";
import { scrapeOtobi } from "../vendors/otobi";

/*
 * Vendor scraper REGISTRY — the single source of truth for "which vendors can we scrape".
 * Mirrors the AI-provider registry / rate-limit guard chain: declare each vendor as data,
 * iterate generically, never branch on a specific vendor elsewhere.
 *
 * TO ADD A VENDOR: write scripts/catalog/vendors/<slug>.ts exporting
 * `scrape<Name>(opts?: ScrapeOptions): Promise<ScrapedProduct[]>`, then add ONE entry here.
 * Nothing in the admin UI, the SSE route, the diff, or the ingest changes — they all read
 * this registry. That is the whole scalability story: the framework is vendor-agnostic; only
 * the per-site adapter (unavoidably) differs, and it's contained to one file + one line.
 */

export interface VendorScraper {
  /** Registry slug — also the `vendor` tag on scraped rows and the URL param. */
  slug: string;
  /** Display name (matches the `vendors` table row created on ingest). */
  name: string;
  /** Whether this adapter drives a headless browser (Playwright) — so the caller closes it. */
  usesBrowser: boolean;
  /** The adapter. Accepts optional streaming/resume/stop hooks (absent = CLI behaviour). */
  scrape: (opts?: ScrapeOptions) => Promise<ScrapedProduct[]>;
}

export const VENDOR_SCRAPERS: Record<string, VendorScraper> = {
  hatil: { slug: "hatil", name: "Hatil", usesBrowser: true, scrape: scrapeHatil },
  brothers: {
    slug: "brothers",
    name: "Brothers Furniture",
    usesBrowser: true,
    scrape: scrapeBrothers,
  },
  otobi: { slug: "otobi", name: "Otobi", usesBrowser: false, scrape: scrapeOtobi },
  navana: { slug: "navana", name: "Navana Furniture", usesBrowser: false, scrape: scrapeNavana },
  hatim: { slug: "hatim", name: "Hatim Furniture", usesBrowser: false, scrape: scrapeHatim },
};

/** All registered vendors, for the admin UI list. */
export function listVendorScrapers(): VendorScraper[] {
  return Object.values(VENDOR_SCRAPERS);
}

/** Look up one vendor by slug, or null. */
export function getVendorScraper(slug: string): VendorScraper | null {
  return VENDOR_SCRAPERS[slug] ?? null;
}

/** Close the shared Playwright browser (no-op if none launched). Call after a scrape run. */
export { closeBrowser };
