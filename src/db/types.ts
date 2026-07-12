/*
 * Inferred domain types (plan §4) — the read-model shapes screens render against.
 *
 * Golden rule: never hand-write a type you can infer. Row shapes come from Drizzle
 * ($inferSelect); composed/joined shapes extend those. In Stage D, list/detail types
 * will additionally be inferred from service return values
 * (Awaited<ReturnType<typeof Service.method>>) — these table-level types stay the base.
 */
import type { users } from "@/db/schemas/auth.schema";
import type { credits, payments } from "@/db/schemas/billing.schema";
import type { designs, designTags } from "@/db/schemas/design.schema";
import type { furnitureItems } from "@/db/schemas/furniture.schema";
import type { vendors } from "@/db/schemas/vendor.schema";

// Base row types
export type User = typeof users.$inferSelect;
export type Design = typeof designs.$inferSelect;
export type DesignTag = typeof designTags.$inferSelect;
export type FurnitureItem = typeof furnitureItems.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type Credit = typeof credits.$inferSelect;
export type Payment = typeof payments.$inferSelect;

// Composed shapes used by screens
/** A furniture pin resolved to its catalog item (result screen). */
export type ResolvedDesignTag = DesignTag & {
  furnitureItem: FurnitureItem | null;
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

/** Credit badge state (e.g. "৫টির মধ্যে ৪টি ফ্রি বাকি"). */
export type CreditState = {
  freeUsed: number;
  freeLimit: number;
  paidCredits: number;
  plan: Credit["plan"];
};
