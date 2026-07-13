import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { DESIGN_STYLES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { logger } from "@/lib/logger";
import { publicProcedure } from "@/server/rpc/procedures";
import { AiService } from "@/server/service/ai/ai.service";
import { measureImage } from "@/server/service/ai/image-preprocess";
import { FurnitureService } from "@/server/service/furniture.service";
import { GenerationLogService } from "@/server/service/generation-log.service";
import { StorageService } from "@/server/service/storage/storage.service";
import { DesignService } from "./design.service";

/*
 * Design router (plan §5.2), adapted to the SYNCHRONOUS Cloudflare flow:
 * generate does upload → AI → store → persist → return the finished design in
 * one request (no job/polling). Scoped by the anonymous session.
 */

// Max accepted base64 payload. The client compresses to <=1.5MB; base64 inflates
// ~33%, so ~10MB is generous headroom while blocking oversized/abusive uploads
// that bypass the client (the server is the real limit — the client can be
// bypassed). ~10MB in chars.
const MAX_IMAGE_CHARS = 10 * 1024 * 1024;
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

// Input: the uploaded room image (base64 data URL or raw base64) + selections.
const GenerateInput = z.object({
  image: z
    .string()
    .min(1)
    .max(MAX_IMAGE_CHARS, "image is too large (max ~7MB)"), // data URL or bare base64
  imageMime: z.enum(ACCEPTED_MIME).default("image/jpeg"),
  roomType: z.enum(ROOM_TYPES),
  style: z.enum(DESIGN_STYLES),
  prompt: z.string().max(500).optional(),
  isPanorama: z.boolean().default(false),
});

function decodeImage(input: string): Buffer {
  const comma = input.indexOf(",");
  const b64 = input.startsWith("data:") && comma !== -1 ? input.slice(comma + 1) : input;
  return Buffer.from(b64, "base64");
}

export const designRouter = {
  generate: publicProcedure.input(GenerateInput).handler(async ({ input, context }) => {
    const bytes = decodeImage(input.image);

    // 1. store the original upload — persist the KEY, not a full URL
    const originalKey = `originals/${context.anonymousId}/${Date.now()}.jpg`;
    await StorageService.put(originalKey, bytes, input.imageMime);

    // 2. create the design row (status: processing)
    const design = await DesignService.create({
      anonymousId: context.anonymousId,
      originalImageUrl: originalKey,
      roomType: input.roomType,
      style: input.style,
      prompt: input.prompt,
      isPanorama: input.isPanorama,
    });
    if (!design)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "could not create design" });

    // 3. run the redesign through the provider fallback chain, store result, persist
    const startedAt = performance.now();
    try {
      const result = await AiService.redesign({
        imageBytes: bytes,
        imageMime: input.imageMime,
        // Providers that fetch by URL need the full public URL, built here.
        imageUrl: StorageService.publicUrl(originalKey) ?? "",
        style: input.style,
        roomType: input.roomType,
        userPrompt: input.prompt,
      });
      const generatedKey = `generated/${context.anonymousId}/${design.id}.png`;
      await StorageService.put(generatedKey, result.bytes, "image/png");
      const outputDims = await measureImage(result.bytes);

      const done = await DesignService.setResult({
        id: design.id,
        anonymousId: context.anonymousId,
        generatedImageUrl: generatedKey,
        status: "done",
        aiProvider: result.provider,
        aiModel: result.model,
      });

      // Technical audit trail — provider/model/cost/latency/sizes/fallback (fire-and-forget).
      await GenerationLogService.log({
        designId: design.id,
        anonymousId: context.anonymousId,
        roomType: input.roomType,
        style: input.style,
        hasUserPrompt: Boolean(input.prompt),
        success: true,
        provider: result.provider,
        model: result.model,
        providersTried: result.providersTried,
        costUsd: result.costUsd,
        latencyMs: Math.round(performance.now() - startedAt),
        inputBytes: result.inputDims.bytes,
        inputWidth: result.inputDims.width,
        inputHeight: result.inputDims.height,
        outputBytes: outputDims.bytes,
        outputWidth: outputDims.width,
        outputHeight: outputDims.height,
      });

      // Place furniture pins for this room type (heuristic "find similar").
      const planned = await FurnitureService.planTags(input.roomType);
      await DesignService.createTags(design.id, planned);

      return done ?? design;
    } catch (err) {
      logger.error({ err, designId: design.id }, "generation failed");
      await DesignService.setResult({
        id: design.id,
        anonymousId: context.anonymousId,
        generatedImageUrl: null,
        status: "failed",
      });

      await GenerationLogService.log({
        designId: design.id,
        anonymousId: context.anonymousId,
        roomType: input.roomType,
        style: input.style,
        hasUserPrompt: Boolean(input.prompt),
        success: false,
        providersTried: (err as { providersTried?: string[] }).providersTried,
        errorMessage: err instanceof Error ? err.message : String(err),
        latencyMs: Math.round(performance.now() - startedAt),
      });

      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "generation failed" });
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.getById({ id: input.id, anonymousId: context.anonymousId }),
    ),

  list: publicProcedure.handler(({ context }) =>
    DesignService.listByAnon({ anonymousId: context.anonymousId }),
  ),
};
