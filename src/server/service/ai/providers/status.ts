import "server-only";

import { cloudflareNeuronUsage } from "./cloudflare/analytics";
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

/** Real per-model Neuron cost, keyed by model id (from Cloudflare analytics). */
export interface ModelUsage {
  calls: number;
  neurons: number;
  costUsd: number;
  avgNeuronsPerCall: number;
  avgCostUsdPerCall: number;
}

/**
 * Real Neuron consumption per model, keyed by model id — so the admin can see actual
 * total + per-call cost for image generation vs furniture tagging vs category mapping.
 *
 * Window: the FULL history Cloudflare retains. The `aiInferenceAdaptiveGroups` dataset
 * only keeps ~31 days, so "all" here means the last 31 days (its maximum) — that's the
 * most complete picture the analytics API can give. Empty map when analytics is
 * unavailable. Never throws.
 */
export async function modelNeuronUsage(): Promise<Record<string, ModelUsage>> {
  const now = new Date();
  const start = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // max retention
  const usage = await cloudflareNeuronUsage(start, now);
  const map: Record<string, ModelUsage> = {};
  for (const u of usage) {
    map[u.modelId] = {
      calls: u.count,
      neurons: u.neurons,
      costUsd: u.costUsd,
      avgNeuronsPerCall: u.avgNeuronsPerCall,
      avgCostUsdPerCall: u.avgCostUsdPerCall,
    };
  }
  return map;
}
