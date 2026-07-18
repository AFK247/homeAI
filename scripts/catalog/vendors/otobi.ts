/**
 * Otobi vendor adapter. Otobi (otobi.com) is a server-rendered ASP.NET site, so this uses
 * plain HTTP + HTML parsing (no browser). It reads Otobi's sitemap for the product URL list
 * (Products.aspx?p=<id>), then fetches each and extracts name / price / image / code.
 *
 * Run standalone to preview as JSON:  bun run scripts/catalog/vendors/otobi.ts
 * Out:                                 scripts/catalog/output/otobi/products.json
 * Ingestion imports `scrapeOtobi()` (see scripts/catalog/ingest.ts).
 */
import { fetchHtml, fetchText, parsePrice, sitemapLocs } from "../lib/http";
import { writeProducts } from "../lib/save";
import type { ScrapedProduct } from "../lib/types";

const BASE = "https://www.otobi.com";
const SITEMAP = `${BASE}/sitemap.xml`;
const VENDOR = "otobi";
const MAX_PRODUCTS = 12;
const CONCURRENCY = 6;

/** Product URLs look like Products.aspx?p=<id>. */
function isProductUrl(url: string): boolean {
  return url.includes("Products.aspx?p=");
}

async function getProductUrls(): Promise<string[]> {
  const xml = await fetchText(SITEMAP);
  if (!xml) return [];
  const products = sitemapLocs(xml).filter(isProductUrl);
  // Spread across the list so the sample isn't all one category block.
  const step = Math.max(1, Math.floor(products.length / MAX_PRODUCTS));
  const picked: string[] = [];
  for (let i = 0; i < products.length && picked.length < MAX_PRODUCTS; i += step) {
    const url = products[i];
    if (url) picked.push(url);
  }
  return picked;
}

/** Otobi has no clean category taxonomy in the product URL; derive a coarse one from the
 *  name (the master-category mapper + AI fix this up on ingest anyway). */
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
  ]) {
    if (n.includes(kw)) return kw;
  }
  return "other";
}

async function scrapeOne(url: string): Promise<ScrapedProduct | null> {
  const root = await fetchHtml(url);
  if (!root) return null;

  const name = root.querySelector("h1")?.text?.trim().replace(/\s+/g, " ") || "(unknown)";

  // Price: the first element mentioning "BDT" (e.g. "BDT 4,83,000").
  const priceText = root
    .querySelectorAll("*")
    .map((e) => e.text)
    .find((t) => /BDT[\s\d,]+/i.test(t) && t.length < 40);

  // Image: the product photo lives under data_images/ (skip logos/payment icons).
  const imgSrc = root
    .querySelectorAll("img")
    .map((i) => i.getAttribute("src"))
    .find((s) => s?.includes("data_images"));
  const imageUrl = imgSrc ? new URL(imgSrc, BASE).href : null;

  // Product code (used as a loose "dimensions/detail" free-text field).
  const codeText = root
    .querySelectorAll("*")
    .map((e) => e.text.trim().replace(/\s+/g, " "))
    .find((t) => /^Product Code:/i.test(t) && t.length < 120);

  return {
    vendor: VENDOR,
    name,
    priceBdt: parsePrice(priceText),
    currency: "BDT",
    category: categoryFromName(name),
    dimensions: codeText ?? null,
    sourceUrl: url,
    imageUrl,
    imageFile: null,
  } satisfies ScrapedProduct;
}

/** Scrape ~12 Otobi products with a small concurrency pool. */
export async function scrapeOtobi(): Promise<ScrapedProduct[]> {
  console.log("Otobi scraper (HTTP) — reading sitemap…");
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
  const products = await scrapeOtobi();
  const file = await writeProducts(VENDOR, products);
  console.log(`\nDone. ${products.length} products → ${file}`);
  process.exit(0);
}
