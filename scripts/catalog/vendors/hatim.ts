/**
 * Hatim Furniture vendor adapter. Hatim (hatimfurniturebd.com) is a server-rendered PHP
 * site, so this uses plain HTTP + HTML parsing (no browser). It reads Hatim's sitemap for
 * the product URL list (…-details), then fetches each and extracts name / price / image /
 * dimensions. Images are served from the admin.* subdomain over HTTP.
 *
 * Run standalone to preview as JSON:  bun run scripts/catalog/vendors/hatim.ts
 * Out:                                 scripts/catalog/output/hatim/products.json
 * Ingestion imports `scrapeHatim()` (see scripts/catalog/ingest.ts).
 */
import { fetchHtml, fetchText, parsePrice, sitemapLocs } from "../lib/http";
import { writeProducts } from "../lib/save";
import type { ScrapedProduct } from "../lib/types";

const SITEMAP = "https://hatimfurniturebd.com/sitemap.xml";
const VENDOR = "hatim";
const MAX_PRODUCTS = 12;
const CONCURRENCY = 6;

/** Product URLs end in "-details". */
function isProductUrl(url: string): boolean {
  return url.includes("-details");
}

async function getProductUrls(): Promise<string[]> {
  const xml = await fetchText(SITEMAP);
  if (!xml) return [];
  const products = sitemapLocs(xml).filter(isProductUrl);
  const step = Math.max(1, Math.floor(products.length / MAX_PRODUCTS));
  const picked: string[] = [];
  for (let i = 0; i < products.length && picked.length < MAX_PRODUCTS; i += step) {
    const url = products[i];
    if (url) picked.push(url);
  }
  return picked;
}

/** Coarse category from the product name (master mapper + AI refine it on ingest). */
function categoryFromName(name: string): string | null {
  const n = name.toLowerCase();
  for (const kw of [
    "sofa",
    "bed",
    "wardrobe",
    "dining",
    "chair",
    "table",
    "cabinet",
    "shelf",
    "rack",
    "almirah",
    "dressing",
    "cupboard",
    "divan",
  ]) {
    if (n.includes(kw)) return kw;
  }
  return "other";
}

async function scrapeOne(url: string): Promise<ScrapedProduct | null> {
  const root = await fetchHtml(url);
  if (!root) return null;

  // Full name lives in the <h3>; fall back to <title>.
  const name =
    root.querySelector("h3")?.text?.trim().replace(/\s+/g, " ") ||
    root.querySelector("title")?.text?.trim().replace(/\s+/g, " ") ||
    "(unknown)";

  // Price: the "Discount Price ৳54,832.00" element (skip the "Total ৳ 0.00" cart line).
  const priceText = root
    .querySelectorAll("*")
    .map((e) => e.text.trim().replace(/\s+/g, " "))
    .find((t) => /Discount Price\s*৳[\d,.]+/i.test(t) && t.length < 40);
  // Fallback: any ৳ amount that isn't the empty cart total.
  const anyPrice = root
    .querySelectorAll("*")
    .map((e) => e.text.trim().replace(/\s+/g, " "))
    .find((t) => /৳\s*[1-9][\d,.]*/.test(t) && !/Total/i.test(t) && t.length < 40);

  // Image: served from admin.hatimfurniturebd.com/images/product/…
  const imageUrl =
    root
      .querySelectorAll("img")
      .map((i) => i.getAttribute("src"))
      .find((s) => s?.includes("/images/product/")) ?? null;

  // Dimensions: "Size (Inch): L 82.60x D67 x H47.2".
  const dimensions = root
    .querySelectorAll("*")
    .map((e) => e.text.trim().replace(/\s+/g, " "))
    .find((t) => /Size\s*\(Inch\)|[LWH]\s*\d/i.test(t) && t.length < 80);

  return {
    vendor: VENDOR,
    name,
    priceBdt: parsePrice(priceText ?? anyPrice),
    currency: "BDT",
    category: categoryFromName(name),
    dimensions: dimensions ?? null,
    sourceUrl: url,
    imageUrl,
    imageFile: null,
  } satisfies ScrapedProduct;
}

/** Scrape ~12 Hatim products with a small concurrency pool. */
export async function scrapeHatim(): Promise<ScrapedProduct[]> {
  console.log("Hatim scraper (HTTP) — reading sitemap…");
  const urls = await getProductUrls();
  console.log(`Found ${urls.length} product URLs to scrape.`);

  const results: ScrapedProduct[] = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const i = next++;
      const url = urls[i];
      if (!url) continue;
      const p = await scrapeOne(url);
      if (p) {
        results.push(p);
        console.log(`  [${results.length}/${urls.length}] ${p.name} — ${p.priceBdt ?? "?"} BDT`);
      } else {
        console.warn(`  FAILED ${url}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker));
  return results;
}

if (import.meta.main) {
  const products = await scrapeHatim();
  const file = await writeProducts(VENDOR, products);
  console.log(`\nDone. ${products.length} products → ${file}`);
  process.exit(0);
}
