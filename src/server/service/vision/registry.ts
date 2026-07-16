import "server-only";

import { logger } from "@/lib/logger";
import { moondreamProvider } from "./providers/moondream.provider";
import type { DetectedTag, DetectRequest, TagProvider } from "./types";

/*
 * Tag-provider chain (ordered fallback), mirroring ../ai/providers/registry.ts.
 * detectWithFallback tries each READY provider in order; the first that succeeds
 * wins. To add or reorder providers: edit CHAIN — nothing else changes.
 *
 * Order = cheapest first. Moondream runs on Cloudflare's free daily Neuron quota
 * (~$0.0002/target), so it leads; a paid fallback (e.g. a Gemini/Florence provider)
 * would slot in after it.
 */
export const CHAIN: TagProvider[] = [moondreamProvider];

export interface DetectChainResult {
  tags: DetectedTag[];
  /** Provider that produced them (null when nothing was ready or all failed). */
  provider: string | null;
}

/**
 * Run detection through the chain.
 *
 * Fan-out lives here, not in providers: a "per-target" provider grounds one phrase
 * per call, so we issue one concurrent call per target and merge. A "batch" provider
 * gets the whole list at once. Providers just declare which they are.
 *
 * A single target failing is tolerated (partial pins beat none); the provider is only
 * considered failed if EVERY target errored, in which case we fall through.
 */
export async function detectWithFallback(req: DetectRequest): Promise<DetectChainResult> {
  const ready = CHAIN.filter((p) => p.isReady());
  if (ready.length === 0) {
    logger.warn("no tag provider is configured — skipping pins");
    return { tags: [], provider: null };
  }

  for (const provider of ready) {
    try {
      if (provider.targetMode === "batch") {
        const tags = await provider.detect(req);
        logger.info({ provider: provider.key, count: tags.length }, "tag detection succeeded");
        return { tags, provider: provider.key };
      }

      // per-target: one concurrent call per word, tolerate individual failures.
      const settled = await Promise.allSettled(
        req.targets.map((t) => provider.detect({ ...req, targets: [t] })),
      );
      const failed = settled.filter((s) => s.status === "rejected");
      if (failed.length === req.targets.length) {
        throw new Error(
          failed[0]?.status === "rejected" ? String(failed[0].reason) : "all targets failed",
        );
      }
      if (failed.length > 0) {
        logger.warn(
          { provider: provider.key, failed: failed.length, total: req.targets.length },
          "some tag targets failed — returning partial pins",
        );
      }
      const tags = settled
        .filter((s): s is PromiseFulfilledResult<DetectedTag[]> => s.status === "fulfilled")
        .flatMap((s) => s.value);
      logger.info({ provider: provider.key, count: tags.length }, "tag detection succeeded");
      return { tags, provider: provider.key };
    } catch (err) {
      logger.warn(
        { provider: provider.key, err: err instanceof Error ? err.message : String(err) },
        "tag provider failed, trying next",
      );
    }
  }

  return { tags: [], provider: null };
}
