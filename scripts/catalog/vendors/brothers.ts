/**
 * Brothers Furniture vendor adapter.
 *
 * NOTE: Brothers looks server-rendered but a raw HTTP GET returns ~16 bytes / is
 * bot-blocked, and the category grid is populated by a client-side API call — so it needs
 * a real browser (Playwright), like Hatil. Modern BD furniture sites generally do.
 *
 * Strategy: open the /category/sofa page in Playwright, let the grid load, collect
 * /product/<slug> links, then visit ~12 product pages and extract fields.
 *
 * Run standalone to preview as JSON:  bun run scripts/catalog/vendors/brothers.ts
 * Out:                                 scripts/catalog/output/brothers/products.json
 * Ingestion imports `scrapeBrothers()` (see scripts/catalog/ingest.ts).
 */
import { closeBrowser, withPage } from "../lib/browser";
import { writeProducts } from "../lib/save";
import type { ScrapedProduct, ScrapeOptions } from "../lib/types";

const BASE = "https://www.brothersfurniture.com.bd";
// A few category listing pages to gather product links from (spread for variety).
const CATEGORY_PATHS = [
  "/category/sofa",
  "/category/bed",
  "/category/dining-chair",
  "/category/almirah",
  "/category/center-table",
];
const VENDOR = "brothers";
const MAX_PRODUCTS = 13;

/** Parse "47,000.00 Tk." / "৳ 47,000" → 47000. */
function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m?.[1] ? Math.round(Number.parseFloat(m[1])) : null;
}

/** Category = the /category/<x> the product link was discovered under. */
function normaliseCategory(path: string): string {
  return path.replace("/category/", "").replace(/-/g, " ").trim();
}

/**
 * Collect product URLs, tagging each with the category page it was found on. We take a
 * quota from EACH category (not `limit` from the first one) so the sample spans
 * categories and — crucially — the category label is correct: a product taken from
 * /category/bed is tagged "bed", never "sofa". First-seen wins on duplicates.
 */
async function getProductUrls(limit: number): Promise<{ url: string; category: string }[]> {
  const perCategory = Math.max(1, Math.ceil(limit / CATEGORY_PATHS.length));
  const found: { url: string; category: string }[] = [];
  const seen = new Set<string>();
  for (const path of CATEGORY_PATHS) {
    if (found.length >= limit) break;
    const category = normaliseCategory(path);
    const hrefs = await withPage(BASE + path, async (page) => {
      // Give the client-side product grid a moment to render.
      await page.waitForSelector('a[href*="/product/"]', { timeout: 15_000 }).catch(() => {});
      return page.$$eval('a[href*="/product/"]', (as: Element[]) =>
        as.map((a) => (a as HTMLAnchorElement).href),
      );
    }).catch(() => [] as string[]);

    let takenHere = 0;
    for (const href of hrefs) {
      if (takenHere >= perCategory || found.length >= limit) break;
      const clean = href.split("?")[0] ?? href;
      if (seen.has(clean)) continue;
      seen.add(clean);
      found.push({ url: clean, category });
      takenHere++;
    }
  }
  return found;
}

async function scrapeOne(url: string, category: string): Promise<ScrapedProduct> {
  return withPage(url, async (page) => {
    const name =
      (await page.locator("h1").first().textContent().catch(() => null))?.trim() ||
      (await page
        .locator('meta[property="og:title"]')
        .getAttribute("content")
        .catch(() => null)) ||
      (await page.title());

    const priceText = await page
      .locator("text=/৳|Tk\\.?|BDT/i")
      .first()
      .textContent()
      .catch(() => null);

    const imageUrl =
      (await page
        .locator('meta[property="og:image"]')
        .getAttribute("content")
        .catch(() => null)) ||
      (await page.locator("img").first().getAttribute("src").catch(() => null));

    // Dimensions/materials live in the description block, introduced by a "Size:" or
    // "material:" label. Grab the smallest element that actually contains "Size:" and
    // a measurement — this avoids picking up a product-name heading by mistake.
    const dimensions = await page
      .locator('p, li, div', { hasText: /Size\s*:|material\s*:/i })
      .filter({ hasText: /\d\s*(?:inch|cm|mm|["″'])|[LWH]\s*[:=]\s*\d/i })
      .last()
      .textContent()
      .catch(() => null);

    // We HOTLINK the vendor image (store the URL only) — never download the file.
    return {
      vendor: VENDOR,
      name: (name ?? "").trim() || "(unknown)",
      priceBdt: parsePrice(priceText),
      currency: "BDT",
      category,
      dimensions: dimensions?.trim() ?? null,
      sourceUrl: url,
      imageUrl,
      imageFile: null,
    } satisfies ScrapedProduct;
  });
}

/** Scrape ~13 Brothers products and return them. Reused by the ingestion script; the
 *  caller closes the browser. */
export async function scrapeBrothers(opts: ScrapeOptions = {}): Promise<ScrapedProduct[]> {
  console.log("Brothers scraper (Playwright) — collecting product links…");
  let targets = await getProductUrls(MAX_PRODUCTS);
  if (opts.skipUrls) targets = targets.filter((t) => !opts.skipUrls?.has(t.url));
  const total = targets.length;
  console.log(`Found ${total} product URLs to scrape.`);
  await opts.onUrls?.(total);

  const products: ScrapedProduct[] = [];
  for (const { url, category } of targets) {
    if (opts.signal?.aborted) break;
    try {
      const p = await scrapeOne(url, category);
      products.push(p);
      await opts.onProduct?.(p, products.length, total);
      console.log(`  [${products.length}/${total}] ${p.name} — ${p.priceBdt ?? "?"} BDT`);
    } catch (err) {
      await opts.onFailed?.(url, (err as Error).message);
      console.warn(`  [${products.length}/${total}] FAILED ${url}: ${(err as Error).message}`);
    }
  }
  return products;
}

async function main() {
  const products = await scrapeBrothers();
  await closeBrowser();
  const file = await writeProducts(VENDOR, products);
  console.log(`\nDone. ${products.length} products → ${file}`);
}

if (import.meta.main) {
  main().catch(async (err) => {
    await closeBrowser();
    console.error(err);
    process.exit(1);
  });
}
