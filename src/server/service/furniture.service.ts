import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import type { SearchParams } from "@/db/helpers/search-params";
import {
  andWhere,
  equalFilters,
  paginate,
  searchFilters,
  sqlCount,
  withSorting,
} from "@/db/helpers/with-filters";
import { categories } from "@/db/schemas/category.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { Region } from "@/db/schemas/shared.schema";
import { vendors } from "@/db/schemas/vendor.schema";
import type { FurnitureDetail, FurnitureItem } from "@/db/types";
import type {
  CreateFurnitureInput,
  UpdateFurnitureInput,
} from "@/db/validations/furniture.validation";

/*
 * Furniture service — catalog reads.
 */

export const FurnitureService = {
  /** Full detail for the tap-a-pin panel: item + vendor + similar (other brands). */
  getDetail: async (id: string): Promise<FurnitureDetail | null> => {
    const [item] = await db.select().from(furnitureItems).where(eq(furnitureItems.id, id));
    if (!item) return null;

    const [vendor] = item.vendorId
      ? await db.select().from(vendors).where(eq(vendors.id, item.vendorId))
      : [];

    // Similar = same master category, different item (other brands / used options).
    const similar = item.categoryId
      ? await db
          .select({
            id: furnitureItems.id,
            brand: furnitureItems.brand,
            priceBdt: furnitureItems.priceBdt,
          })
          .from(furnitureItems)
          .where(
            and(
              eq(furnitureItems.categoryId, item.categoryId),
              ne(furnitureItems.id, item.id),
              eq(furnitureItems.isActive, true),
            ),
          )
          .limit(4)
      : [];

    return { ...item, vendor: vendor ?? null, similar };
  },

  /**
   * "Shop similar" for a furniture pin: up to `limit` active catalog products in a master
   * category and region, cheapest first. Powers the tap-a-pin modal. Images are the
   * vendor's hotlinked URLs (used directly). Empty array when the category has none yet.
   */
  byCategoryId: async (
    categoryId: string,
    region: Region = "bd",
    limit = 4,
  ): Promise<FurnitureItem[]> => {
    return db
      .select()
      .from(furnitureItems)
      .where(
        and(
          eq(furnitureItems.categoryId, categoryId),
          eq(furnitureItems.region, region),
          eq(furnitureItems.isActive, true),
        ),
      )
      .orderBy(furnitureItems.priceBdt)
      .limit(limit);
  },

  /** Paginated catalog list for admin (backend search / filter / sort). Joins the master
   *  category name for display; filters by categoryId. */
  list: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([furnitureItems.name, furnitureItems.brand], params.search),
      ...equalFilters(
        {
          brand: furnitureItems.brand,
          categoryId: furnitureItems.categoryId,
          condition: furnitureItems.condition,
          source: furnitureItems.source,
        },
        params.filters,
      ),
    ]);
    const sortMap = {
      name: furnitureItems.name,
      priceBdt: furnitureItems.priceBdt,
      createdAt: furnitureItems.createdAt,
    };
    return paginate(
      params,
      db.select(sqlCount()).from(furnitureItems).where(where),
      (limit, offset) =>
        db
          .select({
            id: furnitureItems.id,
            name: furnitureItems.name,
            brand: furnitureItems.brand,
            categoryId: furnitureItems.categoryId,
            categoryName: categories.name,
            priceBdt: furnitureItems.priceBdt,
            imageUrl: furnitureItems.imageUrl,
            productUrl: furnitureItems.productUrl,
            condition: furnitureItems.condition,
            source: furnitureItems.source,
            region: furnitureItems.region,
            isActive: furnitureItems.isActive,
            createdAt: furnitureItems.createdAt,
          })
          .from(furnitureItems)
          .leftJoin(categories, eq(furnitureItems.categoryId, categories.id))
          .where(where)
          .orderBy(withSorting(sortMap, params, furnitureItems.createdAt))
          .limit(limit)
          .offset(offset),
    );
  },

  // ── admin CRUD ─────────────────────────────────────────────────────────────

  /** One furniture item by id, or null. */
  getById: async (id: string) => {
    const [row] = await db.select().from(furnitureItems).where(eq(furnitureItems.id, id));
    return row ?? null;
  },

  /** Create a furniture item; returns the new row. */
  create: async (input: CreateFurnitureInput) => {
    const [row] = await db.insert(furnitureItems).values(input).returning();
    return row ?? null;
  },

  /** Update a furniture item by id; returns the updated row (null if it didn't exist). */
  update: async ({ id, ...input }: UpdateFurnitureInput) => {
    const [row] = await db
      .update(furnitureItems)
      .set(input)
      .where(eq(furnitureItems.id, id))
      .returning();
    return row ?? null;
  },

  /** Delete a furniture item by id; returns the removed row (null if it didn't exist). */
  remove: async (id: string) => {
    const [row] = await db.delete(furnitureItems).where(eq(furnitureItems.id, id)).returning();
    return row ?? null;
  },
};
