/*
 * Inferred domain types (plan §4) — the read-model shapes screens render against.
 *
 * Golden rule: never hand-write a type you can infer. Row shapes come from Drizzle
 * ($inferSelect); composed/joined shapes extend those. In Stage D, list/detail types
 * will additionally be inferred from service return values
 * (Awaited<ReturnType<typeof Service.method>>) — these table-level types stay the base.
 */
import type { users } from "@/db/schemas/auth.schema";
import type { creditAccounts, payments } from "@/db/schemas/billing.schema";
import type { categories, vendorCategoryMaps } from "@/db/schemas/category.schema";
import type { designs, designTags } from "@/db/schemas/design.schema";
import type { furnitureItems } from "@/db/schemas/furniture.schema";
import type { generationLogs } from "@/db/schemas/generation-log.schema";
import type { vendors } from "@/db/schemas/vendor.schema";

// Base row types
export type User = typeof users.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type DesignTag = typeof designTags.$inferSelect;
export type FurnitureItem = typeof furnitureItems.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type VendorCategoryMap = typeof vendorCategoryMaps.$inferSelect;
export type CreditAccount = typeof creditAccounts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type GenerationLog = typeof generationLogs.$inferSelect;

// Composed shapes used by screens
/** A furniture pin resolved to its catalog item + master category (result screen). */
export type ResolvedDesignTag = DesignTag & {
  furnitureItem: FurnitureItem | null;
  /** Master category name (e.g. "sofa") — the pin/list label and modal query key. */
  categoryName: string | null;
};

/** Full result-screen payload: the design plus its resolved pins. */
export type DesignWithTags = Design & {
  tags: ResolvedDesignTag[];
};

/** Furniture detail sheet: item + its vendor + "similar in other brands". */
export type FurnitureDetail = FurnitureItem & {
  vendor: Vendor | null;
  similar: Pick<FurnitureItem, "id" | "brand" | "priceBdt">[];
};
