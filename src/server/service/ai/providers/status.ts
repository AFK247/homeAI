import "server-only";

import { CHAIN } from "./registry";

/*
 * Provider chain status for the admin page — the ordered list with each
 * provider's readiness (without exposing any secrets).
 */
export function providerChainStatus() {
  return CHAIN.map((p, i) => ({
    order: i + 1,
    key: p.key,
    label: p.label,
    model: p.model,
    ready: p.isReady(),
  }));
}

/**
 * Every provider key in the chain — for admin filters, so a new provider appears
 * automatically instead of being hardcoded in the UI.
 */
export function providerKeys(): string[] {
  return CHAIN.map((p) => p.key);
}

/**
 * Each provider's remaining balance/quota for the highlighted balance cards.
 * Returns a display string + numeric value (null when the provider exposes no
 * balance, e.g. Cloudflare's free daily quota). Zero cost.
 */
export async function providerBalances() {
  const results = await Promise.all(
    CHAIN.map(async (p) => ({
      key: p.key,
      label: p.label,
      ...(p.balance ? await p.balance() : { display: "—", remaining: null as number | null }),
    })),
  );
  return results;
}

/**
 * Each provider's free-tier quota for the quota cards. null when the provider has
 * no quota concept (pay-as-you-go) or can't report one. Each provider owns its own
 * window semantics, so no caller needs to know a vendor's reset policy.
 */
export async function providerQuotas() {
  return Promise.all(
    CHAIN.map(async (p) => ({
      key: p.key,
      label: p.label,
      quota: p.quota ? await p.quota() : null,
    })),
  );
}
