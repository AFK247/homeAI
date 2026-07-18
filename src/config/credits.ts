/*
 * Credit-system config (docs/CREDIT_SYSTEM.md). CLIENT-SAFE public data only: grant sizes,
 * pricing, packs, open top-up. Whatever is imported here ships to the browser.
 *
 * SECURITY: model IDs / the AI registry are NOT here — they live in the server-only
 * `@/server/service/credit/models` module so they can never leak to the client. The pricing UI
 * only needs the bare cost NUMBERS below (no model names), to estimate "~N redesigns".
 */

// Public credit costs for the "~N redesigns" estimate on pricing — numbers only, no model IDs.
// Keep in sync with the server model registry (models.ts); these are the free/premium tiers.
export const FREE_MODEL_COST = 2;
export const PREMIUM_MODEL_COST = 40;

// ── Grants (§5) ─────────────────────────────────────────────────────────────
/** Anonymous first-visit grant, `free` kind. Guarded by composite identity (§5). */
export const ANON_GRANT_CREDITS = 10;
/** Signup opening grant, `free` kind. SET (replaces) the balance, once per account (§5). */
export const SIGNUP_GRANT_CREDITS = 20;

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
 * Pricing-page packs (§4a) — THREE concrete tiers + a custom Enterprise tier. The public
 * pricing page is USD-only (international-first); a BD/taka page can come later. So packs are
 * priced in whole USD here, and `creditsPerUsd` sets the rate (bigger pack = more credits/$).
 * `credits` includes the bulk bonus.
 */
export const CREDIT_PACKS = [
  { id: "starter", priceUsd: 3, credits: 750, highlight: false },
  { id: "popular", priceUsd: 5, credits: 1300, highlight: true }, // most-popular
  { id: "pro", priceUsd: 10, credits: 2800, highlight: false },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

/**
 * Enterprise — not a fixed price. Big-volume buyers "contact us" (or use a large open top-up).
 * Rendered as a 4th card on the pricing page with a contact CTA instead of a checkout button.
 */
export const ENTERPRISE_TIER = {
  id: "enterprise",
  /** Suggested entry point (USD) for the custom conversation. */
  fromUsd: 50,
} as const;

// ── Open top-up (§4b, "prepaid bridge card") ──────────────────────────────────
export const OPEN_TOPUP_MIN_USD = 5;
export const OPEN_TOPUP_MAX_USD = 500; // fraud ceiling

/**
 * Credits for an arbitrary USD top-up amount — MIRRORS the packs exactly (no discrepancy). The
 * packs define a price→credits curve; a top-up interpolates along it, so entering a pack's price
 * yields exactly that pack's credits ($5 → 1300 like Popular, $10 → 2800 like Pro). Between packs
 * it interpolates linearly; below the cheapest / above the priciest it extends the nearest
 * segment's marginal rate. Keeping this derived from CREDIT_PACKS means the two can never drift.
 */
export function creditsForUsd(amountUsd: number): number {
  const pts = [...CREDIT_PACKS]
    .map((p) => [p.priceUsd, p.credits] as const)
    .sort((a, b) => a[0] - b[0]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return 0;

  // Below the cheapest pack → its average rate from $0.
  if (amountUsd <= first[0]) return Math.floor(amountUsd * (first[1] / first[0]));

  // Within the pack range → linear interpolation between the two surrounding packs.
  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i];
    const hi = pts[i + 1];
    if (lo && hi && amountUsd <= hi[0]) {
      const t = (amountUsd - lo[0]) / (hi[0] - lo[0]);
      return Math.floor(lo[1] + (hi[1] - lo[1]) * t);
    }
  }

  // Above the priciest pack → extend the last segment's marginal rate.
  const prev = pts[pts.length - 2] ?? first;
  const marginal = (last[1] - prev[1]) / (last[0] - prev[0]);
  return Math.floor(last[1] + (amountUsd - last[0]) * marginal);
}

/** Credits for an arbitrary BDT top-up amount (flat rate, floored) — for the future BD page. */
export function creditsForBdt(amountBdt: number): number {
  return Math.floor(amountBdt / CREDIT_PRICE_BDT);
}
