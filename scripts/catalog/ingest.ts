/*
 * Ingest a scraped vendor JSON into the real catalog (marketplace-plan §5 Phase 4).
 *
 *   1) bun run scripts/catalog/vendors/<vendor>.ts                        # scrape → JSON
 *   2) bun --conditions=react-server run scripts/catalog/ingest.ts <vendor>   # JSON → DB
 *
 *   e.g.  bun --conditions=react-server run scripts/catalog/ingest.ts hatil
 *         bun --conditions=react-server run scripts/catalog/ingest.ts brothers
 *
 * PURE DB — no Playwright import, so it runs in seconds and can't hang on the browser. It
 * reads output/<vendor>/products.json, AI-maps any new raw categories (Phase 3, written
 * PENDING for admin approval), resolves each product's raw category to a master categoryId
 * via APPROVED maps, and upserts furnitureItems (region=bd, image hotlinked). Requires
 * --conditions=react-server (imports server-only DB modules).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CategoryService } from "@/app/admin/categories/_modules/category.service";
import { ensureVendor, ingestProducts, loadCategoryMap } from "./lib/ingest";
import type { ScrapedProduct } from "./lib/types";

// Vendor slug → display name (must match how the scraper tags `vendor`).
const VENDOR_NAMES: Record<string, string> = {
  hatil: "Hatil",
  brothers: "Brothers Furniture",
};

async function main() {
  const slug = process.argv[2]?.toLowerCase();
  if (!slug || !VENDOR_NAMES[slug]) {
    console.error(`Usage: ingest.ts <vendor>  (one of: ${Object.keys(VENDOR_NAMES).join(", ")})`);
    process.exit(1);
  }
  const vendorName = VENDOR_NAMES[slug];
  const jsonPath = join(import.meta.dirname, "output", slug, "products.json");

  const products = JSON.parse(await readFile(jsonPath, "utf8")) as ScrapedProduct[];
  console.log(`Loaded ${products.length} products from ${jsonPath}`);

  const vendorId = await ensureVendor(vendorName);
  console.log(`Vendor: ${vendorName} (${vendorId})`);

  // Phase 3: AI-map any raw categories not yet mapped (writes PENDING for review).
  const rawCategories = [
    ...new Set(products.map((p) => p.category).filter((c): c is string => !!c)),
  ];
  const map = await CategoryService.mapVendorCategories(vendorId, rawCategories);
  console.log(
    `Category mapping: +${map.mapped} mapped, +${map.newCategories} new (pending), ${map.skipped} already known.`,
  );

  // Phase 4: resolve via APPROVED maps + upsert.
  const categoryMap = await loadCategoryMap(vendorId);
  const result = await ingestProducts(vendorId, vendorName, products, categoryMap);
  console.log(
    `Ingested: ${result.inserted} new, ${result.updated} updated, ${result.unmatched} without an approved category (approve in /admin/categories).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
