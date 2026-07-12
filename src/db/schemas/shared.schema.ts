import { pgEnum } from "drizzle-orm/pg-core";

/*
 * Centralized pgEnums (plan §3.2). All enum types live here so schemas and validations
 * import from one place. Enum *values* double as the canonical string unions used app-wide.
 */

// Design styles — Bangladeshi-tuned (traditional Bangla is a first-class option, not generic Scandinavian).
export const DESIGN_STYLES = [
  "modern",
  "traditional_bangla",
  "minimal",
  "luxury",
  "scandinavian",
  "classic",
] as const;
export const designStyleEnum = pgEnum("design_style", DESIGN_STYLES);

// Room types — includes prayer corner (নামাজের কোণ), a BD-specific need.
export const ROOM_TYPES = [
  "living_room",
  "bedroom",
  "dining_room",
  "kitchen",
  "prayer_corner",
  "kids_room",
] as const;
export const roomTypeEnum = pgEnum("room_type", ROOM_TYPES);

// Budget hint on the style screen — maps to the plan-driven AI model tier.
export const BUDGET_TIERS = ["low", "medium", "premium"] as const;
export const budgetTierEnum = pgEnum("budget_tier", BUDGET_TIERS);

// AI generation job status (async job + polling flow).
export const GENERATION_STATUSES = ["pending", "processing", "done", "failed"] as const;
export const generationStatusEnum = pgEnum("generation_status", GENERATION_STATUSES);

// Furniture condition + sourcing.
export const FURNITURE_CONDITIONS = ["new", "used"] as const;
export const furnitureConditionEnum = pgEnum("furniture_condition", FURNITURE_CONDITIONS);

export const FURNITURE_SOURCES = ["brand", "bikroy", "fb_marketplace"] as const;
export const furnitureSourceEnum = pgEnum("furniture_source", FURNITURE_SOURCES);

// Vendor types.
export const VENDOR_TYPES = ["brand", "used_seller", "carpenter", "interior_firm"] as const;
export const vendorTypeEnum = pgEnum("vendor_type", VENDOR_TYPES);

// Billing plan.
export const BILLING_PLANS = ["free", "paid", "premium"] as const;
export const billingPlanEnum = pgEnum("billing_plan", BILLING_PLANS);

// Payment status.
export const PAYMENT_STATUSES = ["pending", "success", "failed", "cancelled"] as const;
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);

// Event types — THE vendor sales pitch (plan §3.2 / PROJECT_CONTEXT §10). Instrument from day one.
export const EVENT_TYPES = [
  "generation",
  "tag_click",
  "buy_click",
  "share",
  "save",
  "regenerate",
] as const;
export const eventTypeEnum = pgEnum("event_type", EVENT_TYPES);

// String-union type helpers derived from the enum value arrays (infer, don't redefine).
export type DesignStyle = (typeof DESIGN_STYLES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type BudgetTier = (typeof BUDGET_TIERS)[number];
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];
export type FurnitureCondition = (typeof FURNITURE_CONDITIONS)[number];
export type FurnitureSource = (typeof FURNITURE_SOURCES)[number];
export type VendorType = (typeof VENDOR_TYPES)[number];
export type BillingPlan = (typeof BILLING_PLANS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
