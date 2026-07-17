import { relations } from "drizzle-orm";
import { index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { baseColumns, relationConfig } from "@/db/helpers/base.columns";
import { furnitureItems } from "./furniture.schema";
import { categorySourceEnum, categoryStatusEnum } from "./shared.schema";
import { vendors } from "./vendor.schema";

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

/*
 * categories — the MASTER furniture vocabulary (docs/marketplace-plan.md §3). Flat list,
 * the single source of truth both sides resolve into: the catalog (a furniture item's
 * category) and the AI (a detected pin's category). Editable/approvable from admin.
 *
 * `status`: seed rows are "active"; AI-proposed rows land "pending" until an admin approves.
 * Category names are ALWAYS English (a controlled vocabulary / join key, not UI copy).
 */
export const categories = pgTable(
  "categories",
  {
    id,
    /** Canonical English bucket, unique — the join key, e.g. "sofa". Always English. */
    name: text("name").notNull(),
    /**
     * Which room types the AI should look for this category in (e.g. "bed" → bedroom).
     * The vision detector pulls a room's active categories from here as its detection
     * targets — so what the AI detects is admin-editable, not hardcoded. Empty = never
     * auto-detected (still a valid catalog category, just not an AI target).
     */
    roomTypes: text("room_types").array().notNull().default([]),
    status: categoryStatusEnum("status").notNull().default("active"),
    source: categorySourceEnum("source").notNull().default("seed"),
    ...timestampColumns,
  },
  (t) => [unique("categories_name_key").on(t.name), index("categories_status_idx").on(t.status)],
);

/*
 * vendor_category_maps — each vendor names the same thing differently ("Bar-Stool" /
 * "stool" / "high chair"). One row per (vendor, rawCategory) maps that raw string to a
 * master category. AI-proposed maps land "pending" until approved. Ingestion resolves a
 * scraped product's raw category through here to a master categoryId.
 */
export const vendorCategoryMaps = pgTable(
  "vendor_category_maps",
  {
    id,
    vendorId: text("vendor_id")
      .notNull()
      .references(() => vendors.id, cascade),
    /** The vendor's own category string, verbatim. */
    rawCategory: text("raw_category").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, cascade),
    status: categoryStatusEnum("status").notNull().default("pending"),
    source: categorySourceEnum("source").notNull().default("ai"),
    ...timestampColumns,
  },
  (t) => [
    unique("vendor_category_maps_vendor_raw_key").on(t.vendorId, t.rawCategory),
    index("vendor_category_maps_category_idx").on(t.categoryId),
  ],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  furnitureItems: many(furnitureItems),
  vendorMaps: many(vendorCategoryMaps),
}));

export const vendorCategoryMapsRelations = relations(vendorCategoryMaps, ({ one }) => ({
  vendor: one(vendors, { fields: [vendorCategoryMaps.vendorId], references: [vendors.id] }),
  category: one(categories, {
    fields: [vendorCategoryMaps.categoryId],
    references: [categories.id],
  }),
}));
