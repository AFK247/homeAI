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
 * Business policy (§5): when FALSE (the correct behavior), a purchase ADDS the bought credits to
 * the existing balance — your leftover paid + free credits are preserved. When TRUE, a purchase
 * SETS the balance, wiping any leftover (logged as an `expire` row) — which surprised users by
 * replacing, not topping up, their credits, so it's off. (The signup grant still SETS via its own
 * once-per-account path, independent of this flag.)
 */
export const RESET_BALANCE_ON_PURCHASE = false;

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

/*
 * BD/taka lane packs (§4a) — NATIVE round-taka prices for Bangladeshi buyers. Credits are NOT a
 * straight USD×rate conversion (that yields ugly, over-generous numbers); they're hand-tuned to
 * clean amounts at/below today's ~৳122/USD rate, with a bulk bonus (bigger pack = better rate).
 * The BDT and USD lanes are DIFFERENT deals — a taka buyer gets fewer credits per unit than the
 * dollar buyer — but both resolve to the same underlying `credits`, so fulfilment
 * (`CreditService.grantPurchase`) is identical. SSLCommerz settles in BDT, so priceBdt is the
 * amount actually charged.
 *
 * Card display mirrors the USD lane: only the two higher packs (bd-popular, bd-pro) render as
 * cards; bd-starter stays defined for a future open top-up but isn't shown as its own card.
 */
export const CREDIT_PACKS_BDT = [
  { id: "bd-starter", priceBdt: 300, credits: 650, highlight: false },
  { id: "bd-popular", priceBdt: 500, credits: 1100, highlight: true }, // most-popular
  { id: "bd-pro", priceBdt: 1000, credits: 2300, highlight: false },
] as const;

/** The BDT packs shown as cards — mirrors the USD lane showing only its two higher tiers. */
export const SHOWN_BDT_PACKS = ["bd-popular", "bd-pro"] as const;

export type CreditPackBdtId = (typeof CREDIT_PACKS_BDT)[number]["id"];

/**
 * Resolve any pack id (either lane) to the credits it grants and the BDT amount to charge.
 * SSLCommerz always charges taka, so a USD pack is converted at APPROX_BDT_PER_USD here —
 * this is the ONE place USD→BDT conversion happens for a purchase. Returns null for an
 * unknown id (the server rejects it — never trust a client-supplied pack id blindly).
 */
export function getPackChargeById(
  id: string,
): { packId: string; credits: number; amountBdt: number } | null {
  const bdt = CREDIT_PACKS_BDT.find((p) => p.id === id);
  if (bdt) return { packId: bdt.id, credits: bdt.credits, amountBdt: bdt.priceBdt };
  const usd = CREDIT_PACKS.find((p) => p.id === id);
  if (usd) {
    return {
      packId: usd.id,
      credits: usd.credits,
      amountBdt: Math.round(usd.priceUsd * APPROX_BDT_PER_USD),
    };
  }
  return null;
}

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
// BDT lane top-up bounds (native taka; NOT a USD conversion).
export const OPEN_TOPUP_MIN_BDT = 500;
export const OPEN_TOPUP_MAX_BDT = 50000; // fraud ceiling

/**
 * Credits for an arbitrary USD top-up amount — MIRRORS the packs exactly (no discrepancy). The
 * packs define a price→credits curve; a top-up interpolates along it, so entering a pack's price
 * yields exactly that pack's credits ($5 → 1300 like Popular, $10 → 2800 like Pro). Between packs
 * it interpolates linearly; below the cheapest / above the priciest it extends the nearest
 * segment's marginal rate. Keeping this derived from CREDIT_PACKS means the two can never drift.
 */
export function creditsForUsd(amountUsd: number): number {
  return interpolateCredits(
    amountUsd,
    CREDIT_PACKS.map((p) => [p.priceUsd, p.credits]),
  );
}

/**
 * Credits for an arbitrary BDT top-up — mirrors creditsForUsd but over the TAKA pack curve
 * (CREDIT_PACKS_BDT), so entering a pack's taka price yields exactly that pack's credits
 * (৳500 → 1100, ৳1000 → 2300). The BDT and USD lanes stay independent deals. Derived from the
 * packs so the two can never drift.
 */
export function creditsForBdt(amountBdt: number): number {
  return interpolateCredits(
    amountBdt,
    CREDIT_PACKS_BDT.map((p) => [p.priceBdt, p.credits]),
  );
}

/**
 * Shared price→credits interpolation along a pack curve. `points` are [price, credits] pairs.
 * Below the cheapest pack → its average rate from 0; between packs → linear; above the priciest
 * → extend the last segment's marginal rate. Floored to whole credits.
 */
function interpolateCredits(amount: number, points: Array<[number, number]>): number {
  const pts = [...points].sort((a, b) => a[0] - b[0]);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return 0;

  if (amount <= first[0]) return Math.floor(amount * (first[1] / first[0]));

  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i];
    const hi = pts[i + 1];
    if (lo && hi && amount <= hi[0]) {
      const t = (amount - lo[0]) / (hi[0] - lo[0]);
      return Math.floor(lo[1] + (hi[1] - lo[1]) * t);
    }
  }

  const prev = pts[pts.length - 2] ?? first;
  const marginal = (last[1] - prev[1]) / (last[0] - prev[0]);
  return Math.floor(last[1] + (amount - last[0]) * marginal);
}

/**
 * Resolve an OPEN top-up (arbitrary amount) to the credits + BDT charge, SERVER-SIDE. The client
 * only sends the amount + currency; the server recomputes credits (never trusts a client credit
 * count) and enforces the min/max bounds. USD amounts convert to a taka charge (SSLCommerz settles
 * taka) but credits use the USD curve; BDT amounts stay native. Returns null if out of bounds.
 */
export function getOpenTopupCharge(input: {
  amount: number;
  currency: "usd" | "bdt";
}): { credits: number; amountBdt: number } | null {
  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (input.currency === "bdt") {
    if (amount < OPEN_TOPUP_MIN_BDT || amount > OPEN_TOPUP_MAX_BDT) return null;
    return { credits: creditsForBdt(amount), amountBdt: amount };
  }
  if (amount < OPEN_TOPUP_MIN_USD || amount > OPEN_TOPUP_MAX_USD) return null;
  return { credits: creditsForUsd(amount), amountBdt: Math.round(amount * APPROX_BDT_PER_USD) };
}
