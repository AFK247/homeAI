import { relations } from "drizzle-orm";
import { boolean, index, jsonb, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig, relationConfig } from "@/db/helpers/base.columns";
import { furnitureConditionEnum, furnitureSourceEnum } from "./shared.schema";
import { vendors } from "./vendor.schema";

const { id, ...timestampColumns } = baseColumns;
const { setNull } = relationConfig;

/** Dimensions stored as JSONB; type is the source of truth for the column (see validation). */
export type FurnitureDimensions = {
  width?: number;
  height?: number;
  depth?: number;
  unit?: "in" | "cm";
};

/*
 * furniture_items (plan §3.2) — the local catalog. Hand-curated to start.
 * Tags are "find similar locally", not exact product links (PROJECT_CONTEXT §4).
 */
export const furnitureItems = pgTable(
  "furniture_items",
  {
    id,
    name: text("name").notNull(),
    brand: text("brand"), // Hatil / Otobi / Regal / ...
    category: text("category"), // sofa / table / lamp / ...
    dimensions: jsonb("dimensions").$type<FurnitureDimensions>(),
    priceBdt: numeric("price_bdt", numericConfig),
    imageUrl: text("image_url"),
    productUrl: text("product_url"), // brand store or Bikroy listing
    condition: furnitureConditionEnum("condition").notNull().default("new"),
    source: furnitureSourceEnum("source").notNull().default("brand"),
    vendorId: text("vendor_id").references(() => vendors.id, setNull),
    isActive: boolean("is_active").notNull().default(true),
    ...timestampColumns,
  },
  (t) => [
    index("furniture_category_idx").on(t.category),
    index("furniture_condition_idx").on(t.condition),
  ],
);

export const furnitureItemsRelations = relations(furnitureItems, ({ one }) => ({
  vendor: one(vendors, { fields: [furnitureItems.vendorId], references: [vendors.id] }),
}));
