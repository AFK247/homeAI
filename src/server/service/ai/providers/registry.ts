import "server-only";

import { logger } from "@/lib/logger";
import { preprocessForModel } from "../image-preprocess";
import { cloudflareProvider } from "./cloudflare.provider";
import { openrouterProvider } from "./openrouter.provider";
import type { AiProvider, RedesignRequest, RedesignResult } from "./types";

/*
 * Provider chain (ordered fallback). redesignWithFallback tries each READY
 * provider in order; the first that succeeds wins, and its provider/model are
 * returned so they can be persisted on the design.
 *
 * To reorder or add providers: edit CHAIN. To swap the primary, move it first.
 *
 * Order = cheapest first: Cloudflare has a free daily quota (near-$0/image), so
 * it runs first; OpenRouter (paid, ~$0.016/image) is the fallback once
 * Cloudflare's quota is exhausted or it errors.
 */
export const CHAIN: AiProvider[] = [cloudflareProvider, openrouterProvider];

export async function redesignWithFallback(req: RedesignRequest): Promise<RedesignResult> {
  const ready = CHAIN.filter((p) => p.isReady());
  if (ready.length === 0) {
    throw new Error("no AI provider is configured");
  }

  const errors: string[] = [];
  const providersTried: string[] = [];
  for (const provider of ready) {
    providersTried.push(provider.key);
    try {
      // Conform the input to THIS provider's declared spec (e.g. Cloudflare's
      // <512px cap). Providers without a spec get the shared default unchanged.
      const conformed = provider.inputSpec
        ? await preprocessForModel(req.imageBytes, provider.inputSpec)
        : { bytes: req.imageBytes, mime: req.imageMime };
      const { bytes, costUsd } = await provider.redesign({
        ...req,
        imageBytes: conformed.bytes,
        imageMime: conformed.mime,
      });
      logger.info({ provider: provider.key, model: provider.model, costUsd }, "redesign succeeded");
      return {
        bytes,
        provider: provider.key,
        model: provider.model,
        costUsd: costUsd ?? null,
        providersTried,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.key}: ${msg}`);
      logger.warn({ provider: provider.key, err: msg }, "provider failed, trying next");
    }
  }

  // Attach the attempted chain to the error so the caller can log it.
  const error = new Error(`all AI providers failed — ${errors.join("; ")}`);
  (error as Error & { providersTried?: string[] }).providersTried = providersTried;
  throw error;
}
