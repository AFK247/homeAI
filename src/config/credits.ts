/*
 * Credit-system config (docs/CREDIT_SYSTEM.md). The SINGLE source of truth for what each model
 * costs in credits, how credits are granted, and how packs / open top-up are priced. Changing a
 * model's cost or adding a pricier model is a one-line edit here — it never touches the ledger,
 * service, packs, or user balances (that decoupling is the whole point of abstract credits).
 *
 * Pure data + helpers, no server/db imports — safe to use on client (pricing UI) and server.
 */

export type ModelTier = "free" | "paid";

/**
 * Per-model credit cost + tier. `tier: "free"` models run on `free` credits; `tier: "paid"`
 * models require `paid` credits (§5b security gate). Costs are calibrated to real per-image
 * cost (§3) for a tight free tier and a wide free→premium gap.
 */
export const MODELS = {
  // FREE tier — 2 credits (caps free usage; ~$0 to us via Cloudflare's 10k free neurons/day).
  "cf-flux-klein": { cost: 2, tier: "free" },
  // PREMIUM tier — paid credits only.
  "gemini-nano-banana": { cost: 40, tier: "paid" }, // Google — chosen premium (~$0.039/img)
  // FLAGSHIP tier — future, paid credits only.
  "gpt-image-1": { cost: 150, tier: "paid" }, // OpenAI (~$0.167/img)
  "gpt-image-2": { cost: 190, tier: "paid" }, // OpenAI (~$0.21/img)
} as const satisfies Record<string, { cost: number; tier: ModelTier }>;

export type ModelId = keyof typeof MODELS;

/** Free/anon users are pinned to this model regardless of what the request asks for (§5b). */
export const DEFAULT_MODEL: ModelId = "cf-flux-klein";

/** Unknown model → safe cheap default cost, so a mis-keyed request can never be under-charged. */
export const DEFAULT_MODEL_COST = MODELS[DEFAULT_MODEL].cost;

export function modelCost(model: string): number {
  return (MODELS as Record<string, { cost: number }>)[model]?.cost ?? DEFAULT_MODEL_COST;
}

export function modelTier(model: string): ModelTier {
  return (MODELS as Record<string, { tier: ModelTier }>)[model]?.tier ?? "free";
}

// ── Grants (§5) ─────────────────────────────────────────────────────────────
/** Anonymous first-visit grant, `free` kind. Guarded by composite identity (§5). */
export const ANON_GRANT_CREDITS = 10;
/** Signup opening grant, `free` kind. SET (replaces) the balance, once per account (§5). */
export const SIGNUP_GRANT_CREDITS = 70;

// ── Pricing (§3–4) ──────────────────────────────────────────────────────────
/** 1 credit = ৳0.50. Sets pack + open-top-up pricing. USD via APPROX_BDT_PER_USD. */
export const CREDIT_PRICE_BDT = 0.5;
export const APPROX_BDT_PER_USD = 120;

/**
 * Business policy (§5): a purchase (and the signup grant) SETS the balance rather than adding —
 * leftover credits, including paid ones, are wiped (and logged as an `expire` row). Flip to
 * `false` to switch to summing behavior with zero code change elsewhere.
 */
export const RESET_BALANCE_ON_PURCHASE = true;

/*
 * Pricing-page packs (§4a) — kept to THREE concrete tiers plus a custom Enterprise tier.
 * The open top-up (below) already covers any other amount, so a long pack list is redundant.
 * `credits` includes the bulk bonus; larger packs = cheaper per credit.
 */
export const CREDIT_PACKS = [
  { id: "starter", priceBdt: 300, credits: 700, highlight: false },
  { id: "popular", priceBdt: 500, credits: 1200, highlight: true }, // most-popular
  { id: "pro", priceBdt: 1000, credits: 2600, highlight: false },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

/**
 * Enterprise — not a fixed price. Big-volume buyers "contact us" (or use a large open top-up).
 * Rendered as a 4th card on the pricing page with a contact CTA instead of a checkout button.
 */
export const ENTERPRISE_TIER = {
  id: "enterprise",
  /** Suggested entry point for the custom conversation. */
  fromBdt: 5000,
} as const;

// ── Open top-up (§4b, "prepaid bridge card") ──────────────────────────────────
/** Enter any amount ≥ min; flat rate ৳0.50/credit. */
export const OPEN_TOPUP_MIN_BDT = 600; // ≈ $5
export const OPEN_TOPUP_MAX_BDT = 60_000; // ≈ $500 fraud ceiling

/** Credits for an arbitrary top-up amount (flat rate, floored). */
export function creditsForBdt(amountBdt: number): number {
  return Math.floor(amountBdt / CREDIT_PRICE_BDT);
}
