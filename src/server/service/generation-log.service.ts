import "server-only";

import { db } from "@/db/client";
import { generationLogs } from "@/db/schemas/generation-log.schema";
import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";

/*
 * Generation logging — the engineering/cost audit trail for AI redesigns.
 * One row per generation attempt (provider, model, cost, latency, success,
 * fallback chain). Separate from EventService (product/vendor analytics).
 *
 * Fire-and-forget from the router: logging must never break the user flow.
 */

export interface GenerationLogInput {
  designId?: string | null;
  anonymousId: string | null;
  userId?: string | null;
  roomType: RoomType;
  style: DesignStyle;
  hasUserPrompt: boolean;
  prompt?: string | null;
  success: boolean;
  provider?: string | null;
  model?: string | null;
  imageUrl?: string | null;
  providersTried?: string[];
  errorMessage?: string | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  inputBytes?: number | null;
  inputWidth?: number | null;
  inputHeight?: number | null;
  outputBytes?: number | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
}

export const GenerationLogService = {
  log: async (input: GenerationLogInput): Promise<void> => {
    try {
      await db.insert(generationLogs).values({
        designId: input.designId ?? null,
        anonymousId: input.anonymousId,
        userId: input.userId ?? null,
        roomType: input.roomType,
        style: input.style,
        hasUserPrompt: input.hasUserPrompt,
        prompt: input.prompt ?? null,
        success: input.success,
        provider: input.provider ?? null,
        model: input.model ?? null,
        imageUrl: input.imageUrl ?? null,
        providersTried: input.providersTried ?? null,
        errorMessage: input.errorMessage ?? null,
        costUsd: input.costUsd ?? null,
        latencyMs: input.latencyMs ?? null,
        inputBytes: input.inputBytes ?? null,
        inputWidth: input.inputWidth ?? null,
        inputHeight: input.inputHeight ?? null,
        outputBytes: input.outputBytes ?? null,
        outputWidth: input.outputWidth ?? null,
        outputHeight: input.outputHeight ?? null,
      });
    } catch {
      // Logging must never break the user flow.
    }
  },
};
