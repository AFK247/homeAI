import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { CategoryService } from "@/app/admin/categories/_modules/category.service";
import {
  BUDGET_TIERS,
  type BudgetTier,
  DESIGN_STYLES,
  type DesignStyle,
  ROOM_TYPES,
  type RoomType,
} from "@/db/schemas/shared.schema";
import { logger } from "@/lib/logger";
import { publicProcedure, type RpcContext } from "@/server/rpc/procedures";
import { AiService } from "@/server/service/ai/ai.service";
import { measureImage } from "@/server/service/ai/image-preprocess";
import {
  CreditService,
  InsufficientCreditsError,
  type Owner,
} from "@/server/service/credit/credit.service";
import { DEFAULT_MODEL, type ModelId, modelTier } from "@/server/service/credit/models";
import { GenerationLogService } from "@/server/service/generation-log.service";
import { checkGuards, recordUsage } from "@/server/service/rate-limit/registry";
import { StorageService } from "@/server/service/storage/storage.service";
import { TagService } from "@/server/service/vision/tag.service";
import { DesignService } from "./design.service";

/*
 * Abuse defense: run the guard chain (global daily cap → per-caller burst) before an AI action
 * and record the (permitted) attempt so it counts next time. The free-user limit is NOT a guard —
 * it's enforced by the credit system at reserve time (the credit balance is the source of truth,
 * cost-accurate even when a model's per-render cost changes). Throws a clear oRPC error the UI can
 * show. See src/server/service/rate-limit — adding a layer never touches this code.
 */
async function enforceGuards(context: RpcContext, action: "generate" | "regenerate") {
  const guardCtx = {
    action,
    anonymousId: context.anonymousId,
    userId: context.user?.id ?? null,
    ip: context.ip,
    fingerprint: context.fingerprint,
  };
  const verdict = await checkGuards(guardCtx);
  if (!verdict.allowed) {
    throw new ORPCError(verdict.code === "rate_limited" ? "TOO_MANY_REQUESTS" : "FORBIDDEN", {
      message: verdict.message ?? "Request blocked.",
      data: { code: verdict.code, retryAfterSeconds: verdict.retryAfterSeconds },
    });
  }
  await recordUsage(guardCtx);
}

/*
 * Credit gate (docs/CREDIT_SYSTEM.md §5b) — resolve the model SERVER-SIDE, then reserve credits
 * BEFORE any AI call. The reservation is refunded if the render fails (see runRedesign), so a
 * provider error never costs the user. Runs after enforceGuards (anon flood/free-cap) — credits
 * are the spend layer on top.
 *
 * Model resolution: today the app has no model picker, so every render is the free tier
 * (DEFAULT_MODEL). The gate already enforces the tier rule for when a `model` input is added:
 * a paid-tier model is only reachable by a user with paid credits; free/anon users are pinned
 * to the free model. Returns the reservation so the caller can refund on failure.
 */
function ownerFrom(context: RpcContext): Owner {
  return context.user?.id ? { userId: context.user.id } : { anonymousId: context.anonymousId };
}

async function reserveCredits(context: RpcContext, requested?: string) {
  // Resolve server-side: only a logged-in user may reach a paid-tier model; everyone else is
  // pinned to the free default. (No `requested` today → always the free default.)
  const model: ModelId =
    requested && modelTier(requested) === "paid" && context.user?.id
      ? (requested as ModelId)
      : DEFAULT_MODEL;

  // First-visit anon grant, hardened against cookie-clearing via IP/fingerprint (§5): a device
  // or network that already claimed its free grant can't farm a fresh 10 by clearing cookies.
  if (!context.user?.id) {
    await CreditService.grantAnon(context.anonymousId, {
      ip: context.ip,
      fingerprint: context.fingerprint,
    });
  }

  try {
    return await CreditService.reserve(ownerFrom(context), model);
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      const anonymous = !context.user?.id;
      throw new ORPCError("FORBIDDEN", {
        message: anonymous
          ? "You've used your free credits. Sign in to get more."
          : "You're out of credits. Buy more to keep designing.",
        // `anonymous` tells the client whether to offer "Sign in" (anon) or "Buy more" (logged-in).
        data: { code: "no_credits", needed: err.needed, anonymous },
      });
    }
    throw err;
  }
}

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
  image: z.string().min(1).max(MAX_IMAGE_CHARS, "image is too large (max ~7MB)"), // data URL or bare base64
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
 * the same design).
 */
async function runRedesign(opts: {
  design: { id: string; roomType: RoomType; style: DesignStyle; prompt: string | null };
  anonymousId: string;
  sourceBytes: Buffer;
  sourceMime: string;
  sourceUrl: string;
  budget: BudgetTier;
  /** Credit reservation to refund if this render fails (docs/CREDIT_SYSTEM.md §5b step 4). */
  reservation?: Awaited<ReturnType<typeof CreditService.reserve>>;
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
    const version = await DesignService.addVersion({
      designId: design.id,
      imageUrl: generatedKey,
      aiProvider: result.provider,
      aiModel: result.model,
    });

    const logId = await GenerationLogService.log({
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
      // Real Neurons for the image-gen call (Cloudflare); tagging adds to this below.
      neurons: result.neurons,
      latencyMs: Math.round(performance.now() - startedAt),
      inputBytes: result.inputDims.bytes,
      inputWidth: result.inputDims.width,
      inputHeight: result.inputDims.height,
      outputBytes: outputDims.bytes,
      outputWidth: outputDims.width,
      outputHeight: outputDims.height,
    });

    // Furniture pins: detect what the AI actually placed in THIS render, tied to this
    // version so switching versions shows matching pins. Fire-and-forget — the result
    // screen shows immediately and pins appear a couple of seconds later on refresh.
    // Pins are a bonus: TagService never throws, so this can't fail a generation. Its
    // real Neuron cost is added to the log so `neurons` = the WHOLE pipeline.
    if (version) {
      const versionId = version.id;
      // Detection targets come from the DB (this room's active categories), so what the
      // AI looks for is admin-editable, not hardcoded.
      void CategoryService.targetsForRoom(design.roomType)
        .then((targets) => TagService.detect(result.bytes, "image/png", design.roomType, targets))
        .then(async ({ pins, neurons }) => {
          await DesignService.setVisionTags(design.id, versionId, pins);
          if (logId && neurons) await GenerationLogService.addNeurons(logId, neurons);
        })
        .catch((err) => logger.error({ err, designId: design.id }, "pin detection failed"));
    }

    return done;
  } catch (err) {
    logger.error({ err, designId: design.id }, "generation failed");
    // Refund the reserved credits — a provider failure must never cost the user (§5b step 4).
    if (opts.reservation?.accountId) {
      await CreditService.refund(
        opts.reservation.accountId,
        opts.reservation.fromFree,
        opts.reservation.fromPaid,
      ).catch((e) => logger.error({ e, designId: design.id }, "credit refund failed"));
    }
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
  generate: publicProcedure
    .route({ method: "POST" })
    .input(GenerateInput)
    .handler(async ({ input, context }) => {
      // Abuse defense — before spending any AI budget.
      await enforceGuards(context, "generate");
      // Credit gate — reserve BEFORE the AI call; refunded by runRedesign on failure (§5b).
      const reservation = await reserveCredits(context);

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
      if (!design) {
        // Design creation failed AFTER reserving — refund so the user isn't charged for nothing.
        await CreditService.refund(
          reservation.accountId,
          reservation.fromFree,
          reservation.fromPaid,
        ).catch(() => {});
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "could not create design" });
      }

      // 3. run the redesign, store the result, persist it on the design.
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
        reservation,
      });
      return done ?? design;
    }),

  // Re-run the AI on an existing design's ORIGINAL image, producing a NEW version. The
  // user can change room / style / prompt / panorama on the result screen; any provided
  // values are persisted onto the design first so the new render (and future ones) reflect
  // them. Budget isn't persisted (per-render only) and defaults to "medium". Omitting all
  // params reproduces the old "same settings" behaviour.
  regenerate: publicProcedure
    .route({ method: "POST" })
    .input(
      z.object({
        id: z.string().min(1),
        budget: z.enum(BUDGET_TIERS).default("medium"),
        roomType: z.enum(ROOM_TYPES).optional(),
        style: z.enum(DESIGN_STYLES).optional(),
        prompt: z.string().max(500).optional(),
        isPanorama: z.boolean().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      // Abuse defense — regenerate spends AI budget too.
      await enforceGuards(context, "regenerate");

      const existing = await DesignService.getById({
        id: input.id,
        anonymousId: context.anonymousId,
      });
      if (!existing) throw new ORPCError("NOT_FOUND", { message: "design not found" });

      // Credit gate — regenerate is a fresh render, so it costs credits too (§5b).
      const reservation = await reserveCredits(context);

      // Persist any changed parameters before re-rendering.
      const hasChanges =
        input.roomType !== undefined ||
        input.style !== undefined ||
        input.prompt !== undefined ||
        input.isPanorama !== undefined;
      const design = hasChanges
        ? ((await DesignService.updateParams({
            id: input.id,
            anonymousId: context.anonymousId,
            roomType: input.roomType,
            style: input.style,
            prompt: input.prompt,
            isPanorama: input.isPanorama,
          })) ?? existing)
        : existing;

      // getById resolves originalImageUrl to a public URL; recover the key to
      // fetch the raw source bytes from storage.
      const originalKey = StorageService.keyFromUrl(existing.originalImageUrl);
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
        sourceUrl: existing.originalImageUrl,
        budget: input.budget,
        reservation,
      });

      return DesignService.getById({ id: input.id, anonymousId: context.anonymousId });
    }),

  getById: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.getById({ id: input.id, anonymousId: context.anonymousId }),
    ),

  // PUBLIC read for the shareable /share/<id> page — NOT anon-scoped, so anyone can view it.
  // The service returns a narrowed shape (generated image + room/style + pins only; never the
  // original photo, owner ids, or prompt). Only finished designs resolve; else null → 404.
  getPublicById: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => DesignService.getPublicById({ id: input.id })),

  list: publicProcedure
    .route({ method: "GET" })
    .handler(({ context }) => DesignService.listByAnon({ anonymousId: context.anonymousId })),

  // Version history: list all renders of a design, and switch the active one.
  versions: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ designId: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.listVersions({
        designId: input.designId,
        anonymousId: context.anonymousId,
      }),
    ),

  activateVersion: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ designId: z.string().min(1), versionId: z.string().min(1) }))
    .handler(({ input, context }) =>
      DesignService.activateVersion({
        designId: input.designId,
        versionId: input.versionId,
        anonymousId: context.anonymousId,
      }),
    ),
};
