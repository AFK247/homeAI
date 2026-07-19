import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { vendorCategoryMaps } from "@/db/schemas/category.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { vendors } from "@/db/schemas/vendor.schema";
import type { ScrapedProduct } from "./types";

/*
 * Ingestion (docs/marketplace-plan.md §5 Phase 4): turn scraped products into real
 * `furnitureItems` rows. Resolves each product's raw vendor category to a master
 * `categoryId` via `vendor_category_maps` (only ACTIVE, admin-approved maps), tags the
 * row region="bd", keeps the vendor image (hotlink) + productUrl (buy link), and upserts
 * by productUrl so re-runs update instead of duplicating.
 *
 * Run through Bun with the react-server condition (server-only modules):
 *   bun --conditions=react-server run scripts/catalog/ingest-hatil.ts
 */

/** Find (or create) a vendor row by display name; returns its id. */
export async function ensureVendor(name: string): Promise<string> {
  const [existing] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.name, name));
  if (existing) return existing.id;
  const [created] = await db
    .insert(vendors)
    .values({ name, type: "brand" })
    .returning({ id: vendors.id });
  if (!created) throw new Error(`could not create vendor ${name}`);
  return created.id;
}

/**
 * Build a raw-category → master categoryId lookup for a vendor, from ACTIVE mappings only.
 * Products whose raw category isn't approved yet get categoryId = null (still ingested,
 * just unmatched until the mapping is approved).
 */
export async function loadCategoryMap(vendorId: string): Promise<Map<string, string>> {
  const rows = await db
    .select({ raw: vendorCategoryMaps.rawCategory, categoryId: vendorCategoryMaps.categoryId })
    .from(vendorCategoryMaps)
    .where(and(eq(vendorCategoryMaps.vendorId, vendorId), eq(vendorCategoryMaps.status, "active")));
  return new Map(rows.map((r) => [r.raw, r.categoryId]));
}

export interface IngestResult {
  inserted: number;
  updated: number;
  unmatched: number; // ingested but no approved category mapping
}

/**
 * Upsert scraped products into furnitureItems for a vendor, deduped by productUrl. Batched to
 * avoid the old N+1 (a SELECT + write per product): ONE query fetches all existing rows for this
 * batch's URLs, then new rows go in a SINGLE bulk insert and existing rows are updated — all inside
 * one transaction so a mid-ingest failure rolls back cleanly. (productUrl has no unique constraint,
 * so we pre-resolve existing ids by URL rather than rely on onConflict.)
 */
export async function ingestProducts(
  vendorId: string,
  brand: string,
  products: ScrapedProduct[],
  categoryMap: Map<string, string>,
): Promise<IngestResult> {
  const result: IngestResult = { inserted: 0, updated: 0, unmatched: 0 };
  if (products.length === 0) return result;

  const rowFor = (p: ScrapedProduct) => {
    const categoryId = p.category ? (categoryMap.get(p.category) ?? null) : null;
    if (!categoryId) result.unmatched++;
    return {
      name: p.name,
      brand,
      categoryId,
      priceBdt: p.priceBdt ?? null,
      imageUrl: p.imageUrl ?? null,
      productUrl: p.sourceUrl,
      region: "bd" as const,
      source: "brand" as const,
      vendorId,
      isActive: true,
    };
  };

  const urls = products.map((p) => p.sourceUrl);

  await db.transaction(async (tx) => {
    // ONE query for all existing rows in this batch (was a per-product SELECT).
    const existing = await tx
      .select({ id: furnitureItems.id, productUrl: furnitureItems.productUrl })
      .from(furnitureItems)
      .where(inArray(furnitureItems.productUrl, urls));
    const idByUrl = new Map(existing.map((e) => [e.productUrl, e.id]));

    const toInsert: ReturnType<typeof rowFor>[] = [];
    for (const p of products) {
      const values = rowFor(p);
      const id = idByUrl.get(p.sourceUrl);
      if (id) {
        await tx.update(furnitureItems).set(values).where(eq(furnitureItems.id, id));
        result.updated++;
      } else {
        toInsert.push(values);
      }
    }

    // Single bulk insert for all new rows.
    if (toInsert.length > 0) {
      await tx.insert(furnitureItems).values(toInsert);
      result.inserted += toInsert.length;
    }
  });

  return result;
}
