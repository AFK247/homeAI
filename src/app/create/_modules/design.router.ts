import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import {
  BUDGET_TIERS,
  type BudgetTier,
  DESIGN_STYLES,
  type DesignStyle,
  ROOM_TYPES,
  type RoomType,
} from "@/db/schemas/shared.schema";
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
  budget: z.enum(BUDGET_TIERS).default("medium"),
  prompt: z.string().max(500).optional(),
  isPanorama: z.boolean().default(false),
});

function decodeImage(input: string): Buffer {
  const comma = input.indexOf(",");
  const b64 = input.startsWith("data:") && comma !== -1 ? input.slice(comma + 1) : input;
  return Buffer.from(b64, "base64");
}

/*
 * Shared redesign core: given an existing design row + its source bytes, run the
 * provider chain, store the result, persist it on the design, and log the
 * attempt. Used by both `generate` (first render) and `regenerate` (re-render
 * the same design). Places furniture pins only on the first render.
 */
async function runRedesign(opts: {
  design: { id: string; roomType: RoomType; style: DesignStyle; prompt: string | null };
  anonymousId: string;
  sourceBytes: Buffer;
  sourceMime: string;
  sourceUrl: string;
  budget: BudgetTier;
  placeTags: boolean;
}) {
  const { design, anonymousId } = opts;
  const startedAt = performance.now();
  try {
    const result = await AiService.redesign({
      imageBytes: opts.sourceBytes,
      imageMime: opts.sourceMime,
      imageUrl: opts.sourceUrl,
      style: design.style,
      roomType: design.roomType,
      budget: opts.budget,
      userPrompt: design.prompt,
    });
    // Unique key per render (timestamp) so a regenerate writes a NEW URL — the
    // browser can't serve a cached copy of the old image at the same address.
    const generatedKey = `generated/${anonymousId}/${design.id}-${Date.now()}.png`;
    await StorageService.put(generatedKey, result.bytes, "image/png");
    const outputDims = await measureImage(result.bytes);

    const done = await DesignService.setResult({
      id: design.id,
      anonymousId,
      generatedImageUrl: generatedKey,
      status: "done",
      aiProvider: result.provider,
      aiModel: result.model,
    });

    // Record this render as the active version (history — first render + regenerates).
    await DesignService.addVersion({
      designId: design.id,
      imageUrl: generatedKey,
      aiProvider: result.provider,
      aiModel: result.model,
    });

    await GenerationLogService.log({
      designId: design.id,
      anonymousId,
      roomType: design.roomType,
      style: design.style,
      hasUserPrompt: Boolean(design.prompt),
      prompt: result.prompt,
      success: true,
      provider: result.provider,
      model: result.model,
      imageUrl: generatedKey,
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

    if (opts.placeTags) {
      const planned = await FurnitureService.planTags(design.roomType);
      await DesignService.createTags(design.id, planned);
    }
    return done;
  } catch (err) {
    logger.error({ err, designId: design.id }, "generation failed");
    await DesignService.setResult({
      id: design.id,
      anonymousId,
      generatedImageUrl: null,
      status: "failed",
    });
    await GenerationLogService.log({
      designId: design.id,
      anonymousId,
      roomType: design.roomType,
      style: design.style,
      hasUserPrompt: Boolean(design.prompt),
      success: false,
      providersTried: (err as { providersTried?: string[] }).providersTried,
      errorMessage: err instanceof Error ? err.message : String(err),
      latencyMs: Math.round(performance.now() - startedAt),
    });
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "generation failed" });
  }
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

    // 3. run the redesign, store the result, persist, place furniture pins.
    const done = await runRedesign({
      design: {
        id: design.id,
        roomType: input.roomType,
        style: input.style,
        prompt: input.prompt ?? null,
      },
      anonymousId: context.anonymousId,
      sourceBytes: bytes,
      sourceMime: input.imageMime,
      sourceUrl: StorageService.publicUrl(originalKey) ?? "",
      budget: input.budget,
      placeTags: true,
    });
    return done ?? design;
  }),

  // Re-run the AI on an existing design's ORIGINAL image + same settings, replacing
  // its generated image in place. Budget isn't persisted on designs, so it defaults
  // to "medium" (or an optional client override). Pins are kept as-is.
  regenerate: publicProcedure
    .input(z.object({ id: z.string().min(1), budget: z.enum(BUDGET_TIERS).default("medium") }))
    .handler(async ({ input, context }) => {
      const design = await DesignService.getById({
        id: input.id,
        anonymousId: context.anonymousId,
      });
      if (!design) throw new ORPCError("NOT_FOUND", { message: "design not found" });

      // getById resolves originalImageUrl to a public URL; recover the key to
      // fetch the raw source bytes from storage.
      const originalKey = StorageService.keyFromUrl(design.originalImageUrl);
      const sourceBytes = await StorageService.get(originalKey);

      await runRedesign({
        design: {
          id: design.id,
          roomType: design.roomType,
          style: design.style,
          prompt: design.prompt,
        },
        anonymousId: context.anonymousId,
        sourceBytes,
        sourceMime: "image/jpeg",
        sourceUrl: design.originalImageUrl,
        budget: input.budget,
        placeTags: false,
      });

      return DesignService.getById({ id: input.id, anonymousId: context.anonymousId });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.getById({ id: input.id, anonymousId: context.anonymousId }),
    ),

  list: publicProcedure.handler(({ context }) =>
    DesignService.listByAnon({ anonymousId: context.anonymousId }),
  ),

  // Version history: list all renders of a design, and switch the active one.
  versions: publicProcedure
    .input(z.object({ designId: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.listVersions({
        designId: input.designId,
        anonymousId: context.anonymousId,
      }),
    ),

  activateVersion: publicProcedure
    .input(z.object({ designId: z.string().min(1), versionId: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.activateVersion({
        designId: input.designId,
        versionId: input.versionId,
        anonymousId: context.anonymousId,
      }),
    ),
};
