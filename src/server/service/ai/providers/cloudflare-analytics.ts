import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/*
 * Cloudflare Workers AI analytics — the REAL Neuron consumption, queried from
 * Cloudflare's GraphQL Analytics API (dataset `aiInferenceAdaptiveGroups`,
 * `sum.totalNeurons`). Needs a token with "Account Analytics: Read".
 *
 * This is Cloudflare's actual billed data, not a formula. It is AGGREGATED
 * (per model, per day) with a few minutes' delay — so it gives true totals and
 * true average-cost-per-image, but not a per-request figure at generation time.
 */

const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const USD_PER_NEURON = 0.011 / 1000; // $0.011 per 1,000 Neurons
export const FREE_DAILY_NEURONS = 10_000; // Cloudflare free Workers AI quota/day (resets 00:00 UTC)

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

export interface DailyQuota {
  total: number; // free neurons/day
  used: number; // real neurons used today (all Workers AI models)
  left: number; // remaining (clamped at 0)
  usedPct: number; // 0..100, rounded to 1 decimal (tiny usage stays visible)
}

/**
 * Today's Cloudflare free-quota status from REAL analytics. `startOfUtcDay` must
 * be the UTC midnight the quota resets at.
 */
export async function cloudflareDailyQuota(startOfUtcDay: Date, now: Date): Promise<DailyQuota> {
  const usage = await cloudflareNeuronUsage(startOfUtcDay, now);
  const used = usage.reduce((sum, u) => sum + u.neurons, 0);
  const left = Math.max(0, FREE_DAILY_NEURONS - used);
  // 1-decimal precision so small usage (e.g. 0.1%) doesn't round to a flat 0%.
  const usedPct = Math.min(100, Math.round((used / FREE_DAILY_NEURONS) * 1000) / 10);
  return { total: FREE_DAILY_NEURONS, used, left, usedPct };
}
