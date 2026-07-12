import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { DESIGN_STYLES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { logger } from "@/lib/logger";
import { publicProcedure } from "@/server/rpc/procedures";
import { AiService } from "@/server/service/ai/ai.service";
import { FurnitureService } from "@/server/service/furniture.service";
import { StorageService } from "@/server/service/storage/storage.service";
import { DesignService } from "./design.service";

/*
 * Design router (plan §5.2), adapted to the SYNCHRONOUS Cloudflare flow:
 * generate does upload → AI → store → persist → return the finished design in
 * one request (no job/polling). Scoped by the anonymous session.
 */

// Input: the uploaded room image (base64 data URL or raw base64) + selections.
const GenerateInput = z.object({
  image: z.string().min(1), // data URL (data:image/...;base64,xxx) or bare base64
  imageMime: z.string().default("image/jpeg"),
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

    // 1. store the original upload
    const originalKey = `originals/${context.anonymousId}/${Date.now()}.jpg`;
    const originalImageUrl = await StorageService.put(originalKey, bytes, input.imageMime);

    // 2. create the design row (status: processing)
    const design = await DesignService.create({
      anonymousId: context.anonymousId,
      originalImageUrl,
      roomType: input.roomType,
      style: input.style,
      prompt: input.prompt,
      isPanorama: input.isPanorama,
    });
    if (!design)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "could not create design" });

    // 3. run the redesign (synchronous), store result, persist
    try {
      const generated = await AiService.redesign({
        imageBytes: bytes,
        imageMime: input.imageMime,
        style: input.style,
        roomType: input.roomType,
        userPrompt: input.prompt,
      });
      const generatedKey = `generated/${context.anonymousId}/${design.id}.png`;
      const generatedImageUrl = await StorageService.put(generatedKey, generated, "image/png");

      const done = await DesignService.setResult({
        id: design.id,
        anonymousId: context.anonymousId,
        generatedImageUrl,
        status: "done",
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
