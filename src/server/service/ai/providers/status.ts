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
