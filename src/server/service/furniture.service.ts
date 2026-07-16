import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
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
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { RoomType } from "@/db/schemas/shared.schema";
import { vendors } from "@/db/schemas/vendor.schema";
import type { FurnitureDetail, FurnitureItem } from "@/db/types";

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

    // Similar = same category, different item (other brands / used options).
    const similar = item.category
      ? await db
          .select({
            id: furnitureItems.id,
            brand: furnitureItems.brand,
            priceBdt: furnitureItems.priceBdt,
          })
          .from(furnitureItems)
          .where(
            and(
              eq(furnitureItems.category, item.category),
              ne(furnitureItems.id, item.id),
              eq(furnitureItems.isActive, true),
            ),
          )
          .limit(4)
      : [];

    return { ...item, vendor: vendor ?? null, similar };
  },

  /** Paginated catalog list for admin (backend search / filter / sort). */
  list: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters(
        [furnitureItems.name, furnitureItems.brand, furnitureItems.category],
        params.search,
      ),
      ...equalFilters(
        {
          brand: furnitureItems.brand,
          category: furnitureItems.category,
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
          .select()
          .from(furnitureItems)
          .where(where)
          .orderBy(withSorting(sortMap, params, furnitureItems.createdAt))
          .limit(limit)
          .offset(offset),
    );
  },
};
