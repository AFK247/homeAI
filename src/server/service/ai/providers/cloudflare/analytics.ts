import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { QuotaResult } from "../types";

/*
 * Cloudflare Workers AI analytics — the REAL Neuron consumption, queried from
 * Cloudflare's GraphQL Analytics API (dataset `aiInferenceAdaptiveGroups`,
 * `sum.totalNeurons`). Needs a token with "Account Analytics: Read".
 *
 * VENDOR-PRIVATE: only cloudflare.provider.ts may import this file. Everything
 * else goes through the generic AiProvider.quota() capability.
 *
 * This is Cloudflare's actual billed data, not a formula. It is AGGREGATED with a
 * few minutes' delay — so it gives true totals and true average-cost-per-call, but
 * not a per-request figure at generation time.
 */

const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const USD_PER_NEURON = 0.011 / 1000; // $0.011 per 1,000 Neurons

/**
 * The free Workers AI allocation is a ROLLING 24-HOUR window — NOT a bucket that
 * resets at 00:00 UTC.
 *
 * Verified live: 16,846 Neurons spent at 17:00 UTC still blocked calls at 05:00 UTC
 * the next day, while a "today (UTC)" analytics query reported 0 used. Querying from
 * UTC midnight therefore under-reports and can show 0/10,000 next to a live HTTP 429
 * — a false negative on the exact signal the quota card exists to give. Always query
 * the trailing 24h.
 */
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FREE_NEURONS_PER_24H = 10_000;

const QUERY = `query($acc:String!,$start:Time!,$end:Time!){
  viewer{ accounts(filter:{accountTag:$acc}){
    aiInferenceAdaptiveGroups(limit:1000,filter:{datetime_geq:$start,datetime_leq:$end}){
      count
      dimensions{ modelId }
      sum{ totalNeurons }
    }
  }}
}`;

export interface ModelNeuronUsage {
  modelId: string;
  count: number;
  neurons: number;
  costUsd: number;
  avgNeuronsPerCall: number;
  avgCostUsdPerCall: number;
}

/**
 * Real Workers AI Neuron usage per model over [start, end]. Returns [] if the
 * token lacks analytics scope or the query fails (never throws).
 */
export async function cloudflareNeuronUsage(start: Date, end: Date): Promise<ModelNeuronUsage[]> {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) return [];
  try {
    const res = await fetch(GRAPHQL, {
      method: "POST",
      // Live usage — never serve a cached response from Next.js's fetch cache.
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          acc: env.CLOUDFLARE_ACCOUNT_ID,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }),
    });
    const json = (await res.json()) as {
      data?: {
        viewer?: {
          accounts?: Array<{
            aiInferenceAdaptiveGroups?: Array<{
              count: number;
              dimensions: { modelId: string };
              sum: { totalNeurons: number };
            }>;
          }>;
        };
      };
      errors?: unknown;
    };
    if (json.errors) {
      logger.warn({ errors: json.errors }, "cloudflare analytics query returned errors");
      return [];
    }
    const groups = json.data?.viewer?.accounts?.[0]?.aiInferenceAdaptiveGroups ?? [];
    return groups.map((g) => {
      const neurons = g.sum.totalNeurons;
      const costUsd = neurons * USD_PER_NEURON;
      return {
        modelId: g.dimensions.modelId,
        count: g.count,
        neurons,
        costUsd,
        avgNeuronsPerCall: g.count ? neurons / g.count : 0,
        avgCostUsdPerCall: g.count ? costUsd / g.count : 0,
      };
    });
  } catch (err) {
    logger.warn({ err }, "cloudflare analytics fetch failed");
    return [];
  }
}

/**
 * Cloudflare's free-quota status from REAL analytics, over the trailing 24h (see
 * QUOTA_WINDOW_MS — the window is rolling, not midnight-reset). `used` counts every
 * Workers AI model on the account, image generation and vision alike, which is
 * correct: they share one Neuron pool.
 */
export async function cloudflareNeuronQuota(): Promise<QuotaResult> {
  const now = new Date();
  const start = new Date(now.getTime() - QUOTA_WINDOW_MS);
  const usage = await cloudflareNeuronUsage(start, now);
  const used = usage.reduce((sum, u) => sum + u.neurons, 0);
  return {
    total: FREE_NEURONS_PER_24H,
    used,
    left: Math.max(0, FREE_NEURONS_PER_24H - used),
    // 1-decimal precision so small usage (e.g. 0.1%) doesn't round to a flat 0%.
    usedPct: Math.min(100, Math.round((used / FREE_NEURONS_PER_24H) * 1000) / 10),
    window: "rolling 24h",
  };
}
