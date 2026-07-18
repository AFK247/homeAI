/**
 * Shape of one scraped furniture product. Deliberately mirrors the fields the real
 * `furnitureItems` table cares about (name, price, category, image) so the spike's
 * output reads like a preview of a future catalog row — but this is a throwaway PoC
 * and writes to NO database.
 */
export interface ScrapedProduct {
  /** Vendor key, e.g. "hatil" | "brothers". */
  vendor: string;
  /** Product display name. */
  name: string;
  /** Price in BDT as a plain number (parsed from "47,000.00 Tk."), or null if absent. */
  priceBdt: number | null;
  /** Always "BDT" for these Bangladeshi vendors — kept explicit for future multi-currency. */
  currency: "BDT";
  /** Category, taken from the URL segment where possible (e.g. "sofa", "accent-chair"). */
  category: string | null;
  /** Free-text size/material info when the page exposes it; not normalised. */
  dimensions?: string | null;
  /** The live product page this was scraped from. */
  sourceUrl: string;
  /** The remote image URL found on the page. */
  imageUrl: string | null;
  /** Local filename the image was downloaded to (relative to the brand's images/ dir). */
  imageFile: string | null;
}

/**
 * Optional streaming hooks passed to a scraper (observer pattern). Absent for the CLI path
 * (scrapers behave exactly as before); the admin/catalog SSE route passes them to checkpoint
 * each product and stream live progress. Keeping them OPTIONAL means one signature serves both
 * callers without touching the CLI behaviour.
 */
export interface ScrapeOptions {
  /** Fired once the full product-URL list is known, so the UI can show the denominator. */
  onUrls?: (total: number) => void | Promise<void>;
  /** Fired as each product finishes. `index` is 1-based over the URLs actually scraped. */
  onProduct?: (product: ScrapedProduct, index: number, total: number) => void | Promise<void>;
  /** Fired when a single URL fails (skipped, not fatal) so the UI can count it. */
  onFailed?: (url: string, error: string) => void | Promise<void>;
  /** Resume support: URLs already staged are skipped before scraping begins. */
  skipUrls?: Set<string>;
  /** Abort signal — checked between products so the operator's Stop takes effect promptly. */
  signal?: AbortSignal;
}
