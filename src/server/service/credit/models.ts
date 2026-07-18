import "server-only";

/*
 * AI model registry — SERVER-ONLY. The real model IDs, tiers, and credit costs live here and must
 * NEVER reach the client (`import "server-only"` makes a client import a build error). Exposing
 * which models we run — or their exact IDs — is a competitive/security leak, so the pricing UI
 * only ever sees the bare cost numbers re-exported from config/credits.ts, never these IDs.
 *
 * Adding/repricing a model is a one-line edit here; it never touches the ledger, packs, or
 * balances (the abstract-credit decoupling, docs/CREDIT_SYSTEM.md §2).
 */

export type ModelTier = "free" | "paid";

export const MODELS = {
  // FREE tier — 2 credits (caps free usage; ~$0 to us via Cloudflare's 10k free neurons/day).
  "cf-flux-klein": { cost: 2, tier: "free" },
  // PREMIUM tier — paid credits only.
  "gemini-nano-banana": { cost: 40, tier: "paid" }, // ~$0.039/img
  // FLAGSHIP tier — future, paid credits only.
  "gpt-image-1": { cost: 150, tier: "paid" }, // ~$0.167/img
  "gpt-image-2": { cost: 190, tier: "paid" }, // ~$0.21/img
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
