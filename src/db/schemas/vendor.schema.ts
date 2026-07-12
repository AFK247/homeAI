import { relations } from "drizzle-orm";
import { boolean, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig } from "@/db/helpers/base.columns";
import { furnitureItems } from "./furniture.schema";
import { vendorTypeEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;

/*
 * vendors (plan §3.2) — brands, used-sellers, carpenters, interior firms.
 * Owned by admin role, not end users. commissionRate + isVerified feed Phase 2 revenue.
 */
export const vendors = pgTable("vendors", {
  id,
  name: text("name").notNull(),
  type: vendorTypeEnum("type").notNull(),
  contact: text("contact"),
  websiteUrl: text("website_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  commissionRate: numeric("commission_rate", numericConfig), // % — nullable until negotiated
  ...timestampColumns,
});

export const vendorsRelations = relations(vendors, ({ many }) => ({
  furnitureItems: many(furnitureItems),
}));
