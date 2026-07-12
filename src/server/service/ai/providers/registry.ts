import "server-only";

import { logger } from "@/lib/logger";
import { cloudflareProvider } from "./cloudflare.provider";
import { pollinationsProvider } from "./pollinations.provider";
import type { AiProvider, RedesignRequest, RedesignResult } from "./types";

/*
 * Provider chain (ordered fallback). redesignWithFallback tries each READY
 * provider in order; the first that succeeds wins, and its provider/model are
 * returned so they can be persisted on the design.
 *
 * To reorder or add providers: edit CHAIN. To swap the primary, move it first.
 */
export const CHAIN: AiProvider[] = [cloudflareProvider, pollinationsProvider];

export async function redesignWithFallback(req: RedesignRequest): Promise<RedesignResult> {
  const ready = CHAIN.filter((p) => p.isReady());
  if (ready.length === 0) {
    throw new Error("no AI provider is configured");
  }

  const errors: string[] = [];
  for (const provider of ready) {
    try {
      const bytes = await provider.redesign(req);
      logger.info({ provider: provider.key, model: provider.model }, "redesign succeeded");
      return { bytes, provider: provider.key, model: provider.model };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.key}: ${msg}`);
      logger.warn({ provider: provider.key, err: msg }, "provider failed, trying next");
    }
  }

  throw new Error(`all AI providers failed — ${errors.join("; ")}`);
}
