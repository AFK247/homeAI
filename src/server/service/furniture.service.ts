import "server-only";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { RoomType } from "@/db/schemas/shared.schema";
import { vendors } from "@/db/schemas/vendor.schema";
import type { FurnitureDetail, FurnitureItem } from "@/db/types";

/*
 * Furniture service — catalog reads + heuristic tag selection.
 *
 * Tags are "find similar locally" (PROJECT_CONTEXT §4), so we don't detect
 * furniture in the image. Instead, per room type we pick sensible catalog
 * categories and place pins at preset positions on the generated image.
 */

/**
 * Which furniture categories to surface per room type, and where to pin them
 * (x,y as 0..1 relative coords on the generated image). Order = pin order.
 */
const ROOM_PINS: Record<RoomType, { category: string; x: number; y: number }[]> = {
  living_room: [
    { category: "sofa", x: 0.34, y: 0.62 },
    { category: "coffee_table", x: 0.52, y: 0.74 },
    { category: "lamp", x: 0.8, y: 0.45 },
    { category: "tv_cabinet", x: 0.5, y: 0.4 },
  ],
  bedroom: [
    { category: "bed", x: 0.45, y: 0.6 },
    { category: "bedside_table", x: 0.74, y: 0.58 },
    { category: "wardrobe", x: 0.85, y: 0.4 },
  ],
  dining_room: [
    { category: "dining_table", x: 0.5, y: 0.62 },
    { category: "dining_chair", x: 0.3, y: 0.66 },
  ],
  kitchen: [{ category: "kitchen_cabinet", x: 0.5, y: 0.45 }],
  prayer_corner: [
    { category: "rug", x: 0.5, y: 0.7 },
    { category: "lamp", x: 0.8, y: 0.4 },
  ],
  kids_room: [
    { category: "bed", x: 0.4, y: 0.62 },
    { category: "desk", x: 0.75, y: 0.6 },
    { category: "bookshelf", x: 0.86, y: 0.42 },
  ],
};

export interface PlannedTag {
  furnitureItemId: string;
  label: string;
  xCoord: number;
  yCoord: number;
}

export const FurnitureService = {
  /**
   * Plan the pins for a design: for each category the room type calls for, pick
   * a "new" catalog item and return its id + position. Skips categories with no
   * catalog match so we never place an empty pin.
   */
  planTags: async (roomType: RoomType): Promise<PlannedTag[]> => {
    const plan = ROOM_PINS[roomType];
    const categories = plan.map((p) => p.category);
    const items = await db
      .select()
      .from(furnitureItems)
      .where(
        and(
          inArray(furnitureItems.category, categories),
          eq(furnitureItems.condition, "new"),
          eq(furnitureItems.isActive, true),
        ),
      );

    const byCategory = new Map<string, FurnitureItem>();
    for (const item of items) {
      if (item.category && !byCategory.has(item.category)) byCategory.set(item.category, item);
    }

    const tags: PlannedTag[] = [];
    for (const p of plan) {
      const item = byCategory.get(p.category);
      if (!item) continue;
      tags.push({
        furnitureItemId: item.id,
        label: item.category ?? item.name,
        xCoord: p.x,
        yCoord: p.y,
      });
    }
    return tags;
  },

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

  /** Paginated catalog list for admin. */
  list: async () => {
    return db.select().from(furnitureItems).orderBy(sql`${furnitureItems.createdAt} desc`);
  },
};
