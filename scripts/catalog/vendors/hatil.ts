/**
 * Hatil vendor adapter. Hatil's product pages are JS-rendered, so this uses Playwright
 * (a real headless browser). It reads Hatil's public sitemap for the product URL list —
 * no crawling/guessing — then scrapes each and extracts name/price/category/image.
 *
 * Run standalone to preview as JSON:  bun run scripts/catalog/vendors/hatil.ts
 * Out:                                 scripts/catalog/output/hatil/products.json
 *
 * Ingestion imports `scrapeHatil()` instead (see scripts/catalog/ingest-hatil.ts).
 */
import { closeBrowser, withPage } from "../lib/browser";
import { writeProducts } from "../lib/save";
import type { ScrapedProduct } from "../lib/types";

const SITEMAP_URL = "https://hatil-image.s3.ap-southeast-1.amazonaws.com/xml_files/sitemap-bd.xml";
const VENDOR = "hatil";
const MAX_PRODUCTS = 12;
const CONCURRENCY = 6; // scrape this many product pages at once

/** A product URL looks like https://hatil.com/<Category>/<model-slug>. Category and
 *  blog/info pages are excluded (they have a single path segment or known prefixes). */
function isProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname !== "hatil.com" && u.hostname !== "www.hatil.com") return false;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return false; // exactly /<category>/<slug>
    // Exclude obvious non-product landing pages.
    if (parts[0]?.includes("price-in-bangladesh")) return false;
    return true;
  } catch {
    return false;
  }
}

/** Category is the first path segment, normalised ("accent-chair", "sofa", ...). */
function categoryFromUrl(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[0]?.toLowerCase().replace(/-/g, " ").trim() ?? null;
  } catch {
    return null;
  }
}

/** Parse "৳ 47,000" / "47,000.00 Tk." → 47000. */
function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m?.[1] ? Math.round(Number.parseFloat(m[1])) : null;
}

async function getProductUrls(): Promise<string[]> {
  const res = await fetch(SITEMAP_URL);
  const xml = await res.text();
  // Hatil's sitemap uses a namespace prefix (<ns0:loc>), so match an optional prefix.
  const locs = [...xml.matchAll(/<(?:\w+:)?loc>([^<]+)<\/(?:\w+:)?loc>/g)].map((m) =>
    (m[1] ?? "").trim(),
  );
  const products = locs.filter(isProductUrl);
  // Spread across categories so the sample isn't all one type.
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const url of products) {
    const cat = categoryFromUrl(url) ?? "";
    if (seen.has(cat)) continue; // one per category first…
    seen.add(cat);
    picked.push(url);
    if (picked.length >= MAX_PRODUCTS) break;
  }
  // …then top up from the rest if we have fewer categories than MAX_PRODUCTS.
  for (const url of products) {
    if (picked.length >= MAX_PRODUCTS) break;
    if (!picked.includes(url)) picked.push(url);
  }
  return picked;
}

async function scrapeOne(url: string): Promise<ScrapedProduct> {
  return withPage(url, async (page) => {
    // Name: prefer the <h1>, fall back to og:title / <title>.
    const name =
      (await page.locator("h1").first().textContent().catch(() => null))?.trim() ||
      (await page
        .locator('meta[property="og:title"]')
        .getAttribute("content")
        .catch(() => null)) ||
      (await page.title());

    // Price: find the first element on the page whose text contains ৳ or Tk.
    const priceText = await page
      .locator("text=/৳|Tk\\.?|BDT/i")
      .first()
      .textContent()
      .catch(() => null);

    // Image: og:image is the most reliable single hero image.
    const imageUrl =
      (await page
        .locator('meta[property="og:image"]')
        .getAttribute("content")
        .catch(() => null)) ||
      (await page
        .locator("img")
        .first()
        .getAttribute("src")
        .catch(() => null));

    // Dimensions: only accept text that looks like real measurements (e.g. "L: 48\" W: 24\"",
    // "120 x 60 cm"), not any stray colon/quote (which used to match the footer email).
    const dimensions = await page
      .locator('text=/\\d\\s*(?:inch|cm|mm|["″])|[LWH]\\s*[:=]\\s*\\d|\\d+\\s*[x×]\\s*\\d+/i')
      .first()
      .textContent()
      .catch(() => null);

    // We HOTLINK the vendor image (store the URL only) — never download the file.
    return {
      vendor: VENDOR,
      name: (name ?? "").trim() || "(unknown)",
      priceBdt: parsePrice(priceText),
      currency: "BDT",
      category: categoryFromUrl(url),
      dimensions: dimensions?.trim() ?? null,
      sourceUrl: url,
      imageUrl,
      imageFile: null,
    } satisfies ScrapedProduct;
  });
}

/** Scrape all urls with a bounded concurrency pool (fast, still polite). */
async function scrapePool(urls: string[], concurrency: number): Promise<ScrapedProduct[]> {
  const results: ScrapedProduct[] = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const i = next++;
      const url = urls[i];
      if (!url) continue;
      try {
        const p = await scrapeOne(url);
        results.push(p);
        console.log(`  [${results.length}/${urls.length}] ${p.name} — ${p.priceBdt ?? "?"} BDT`);
      } catch (err) {
        console.warn(`  FAILED ${url}: ${(err as Error).message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return results;
}

/** Scrape ~12 Hatil products and return them. Reused by the ingestion script; the caller
 *  closes the browser. */
export async function scrapeHatil(): Promise<ScrapedProduct[]> {
  console.log("Hatil scraper (Playwright) — reading sitemap…");
  const urls = await getProductUrls();
  console.log(`Found ${urls.length} product URLs to scrape (concurrency ${CONCURRENCY}).`);
  return scrapePool(urls, CONCURRENCY);
}

async function main() {
  const products = await scrapeHatil();
  await closeBrowser();
  const file = await writeProducts(VENDOR, products);
  console.log(`\nDone. ${products.length} products → ${file}`);
}

// Only run the standalone JSON export when invoked directly (not when imported for ingest).
if (import.meta.main) {
  main().catch(async (err) => {
    await closeBrowser();
    console.error(err);
    process.exit(1);
  });
}
