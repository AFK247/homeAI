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
