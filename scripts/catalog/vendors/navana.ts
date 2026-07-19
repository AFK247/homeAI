/**
 * Navana Furniture vendor adapter. Navana (navanafurniture.com) runs WooCommerce, which
 * exposes a clean public Store API — so this adapter needs NO HTML scraping at all: it
 * reads structured JSON (name, price, image, categories) straight from
 * /wp-json/wc/store/products. The cleanest of all our vendors.
 *
 * Run standalone to preview as JSON:  bun run scripts/catalog/vendors/navana.ts
 * Out:                                 scripts/catalog/output/navana/products.json
 * Ingestion imports `scrapeNavana()` (see scripts/catalog/ingest.ts).
 */
import { fetchJsonOrThrow } from "../lib/http";
import { isUsableProduct, productIssue } from "../lib/quality";
import { writeProducts } from "../lib/save";
import type { ScrapedProduct, ScrapeOptions } from "../lib/types";

const API = "https://www.navanafurniture.com/wp-json/wc/store/products";
const VENDOR = "navana";
const MAX_PRODUCTS = 12;

interface WcProduct {
  name: string;
  permalink: string;
  prices?: { price?: string; currency_minor_unit?: number };
  images?: Array<{ src?: string }>;
  categories?: Array<{ name?: string }>;
}

/** WooCommerce prices are integer minor units (paisa) — scale by currency_minor_unit. */
function toBdt(prices: WcProduct["prices"]): number | null {
  if (!prices?.price) return null;
  const raw = Number.parseInt(prices.price, 10);
  if (!Number.isFinite(raw)) return null;
  const minor = prices.currency_minor_unit ?? 2;
  return Math.round(raw / 10 ** minor);
}

/** The most specific (last) WooCommerce category, skipping the generic top buckets. */
function bestCategory(cats: WcProduct["categories"]): string | null {
  const names = (cats ?? []).map((c) => c.name).filter((n): n is string => !!n);
  const skip = new Set(["All Furniture", "Home Furniture", "Office Furniture"]);
  const specific = names.filter((n) => !skip.has(n));
  return (specific.at(-1) ?? names.at(-1) ?? null)?.toLowerCase() ?? null;
}

/** Scrape ~12 Navana products via the WooCommerce Store API (one request, retried + guarded). */
export async function scrapeNavana(opts: ScrapeOptions = {}): Promise<ScrapedProduct[]> {
  console.log("Navana scraper (WooCommerce Store API)…");

  // Guarded + retried: a network error / bad JSON here used to throw and kill the whole run.
  let products: WcProduct[];
  try {
    products = await fetchJsonOrThrow<WcProduct[]>(
      `${API}?per_page=${MAX_PRODUCTS}&orderby=popularity`,
    );
  } catch (err) {
    console.warn(`Navana API failed: ${(err as Error).message}`);
    await opts.onFailed?.(API, (err as Error).message);
    return [];
  }

  if (opts.skipUrls) products = products.filter((p) => !opts.skipUrls?.has(p.permalink));
  const total = products.length;
  await opts.onUrls?.(total);

  const out: ScrapedProduct[] = [];
  for (const p of products) {
    if (opts.signal?.aborted) break;
    const item: ScrapedProduct = {
      vendor: VENDOR,
      name: p.name?.trim() || "(unknown)",
      priceBdt: toBdt(p.prices),
      currency: "BDT",
      category: bestCategory(p.categories),
      dimensions: null,
      sourceUrl: p.permalink,
      imageUrl: p.images?.[0]?.src ?? null,
      imageFile: null,
    };
    // Validate before staging: a null-name/price row is a broken parse, not a product.
    if (!isUsableProduct(item)) {
      await opts.onFailed?.(p.permalink, productIssue(item) ?? "unusable");
      continue;
    }
    out.push(item);
    await opts.onProduct?.(item, out.length, total);
    console.log(`  [${out.length}/${total}] ${item.name} — ${item.priceBdt} BDT`);
  }
  return out;
}

if (import.meta.main) {
  const products = await scrapeNavana();
  const file = await writeProducts(VENDOR, products);
  console.log(`\nDone. ${products.length} products → ${file}`);
  process.exit(0);
}
