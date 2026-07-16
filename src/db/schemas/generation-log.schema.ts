import { boolean, index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, relationConfig } from "@/db/helpers/base.columns";
import { users } from "./auth.schema";
import { designs } from "./design.schema";
import { designStyleEnum, roomTypeEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;
const { setNull } = relationConfig;

// USD cost stored with more precision than the money default (6 decimals) —
// per-image costs are fractions of a cent (e.g. 0.016000).
const costConfig = { mode: "number", precision: 12, scale: 6 } as const;

/*
 * generation_logs — dedicated technical record of every AI redesign attempt.
 * Separate from `events` (product/vendor analytics) on purpose: this is the
 * engineering/cost audit trail — which provider + model ran, what it cost, how
 * long it took, whether it succeeded, and the fallback chain that was tried.
 *
 * One row per generation attempt. Scoped anonymous-first (userId nullable).
 * Indexed for the queries we actually run: spend over time, cost/latency by
 * model, and per-design lookups.
 */
export const generationLogs = pgTable(
  "generation_logs",
  {
    id,
    // The design this generation produced (nullable: a total failure may log
    // before/without a usable design row).
    designId: text("design_id").references(() => designs.id, setNull),
    userId: text("user_id").references(() => users.id, setNull),
    anonymousId: text("anonymous_id"),

    // What was requested.
    roomType: roomTypeEnum("room_type").notNull(),
    style: designStyleEnum("style").notNull(),
    hasUserPrompt: boolean("has_user_prompt").notNull().default(false),
    // The full assembled prompt actually sent to the model (for debugging quality).
    prompt: text("prompt"),

    // What ran + outcome.
    provider: text("provider"), // winning provider key; null if all failed
    model: text("model"), // winning model id
    imageUrl: text("image_url"), // storage KEY of THIS attempt's output image (null on failure)
    success: boolean("success").notNull(),
    // Ordered list of providers attempted, e.g. ["openrouter","cloudflare"] —
    // lets us measure fallback rate without a second table.
    providersTried: text("providers_tried").array(),
    errorMessage: text("error_message"), // set when success = false

    // Cost + performance.
    costUsd: numeric("cost_usd", costConfig), // provider-reported USD; null if unknown
    // Real Neurons this generation consumed (Cloudflare's `cf-ai-neurons` header):
    // the image-gen call plus the furniture-tagging calls, summed. null when the
    // winning provider doesn't report neurons (e.g. OpenRouter is $-billed).
    neurons: numeric("neurons", costConfig),
    latencyMs: integer("latency_ms"), // wall-clock for the whole redesign

    // Image sizes. Dimensions explain the cost for MP-billed models (e.g. klein
    // $0.014/first MP): megapixels = width*height/1e6, so it's derived at read
    // time, NOT stored (would be redundant with width/height).
    inputBytes: integer("input_bytes"), // preprocessed image size sent to the model
    inputWidth: integer("input_width"),
    inputHeight: integer("input_height"),
    outputBytes: integer("output_bytes"),
    outputWidth: integer("output_width"),
    outputHeight: integer("output_height"),

    ...timestampColumns,
  },
  (t) => [
    index("generation_logs_created_idx").on(t.createdAt),
    index("generation_logs_model_idx").on(t.model),
    index("generation_logs_design_idx").on(t.designId),
    index("generation_logs_success_idx").on(t.success),
  ],
);
