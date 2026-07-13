import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AiProvider, RedesignProviderResult, RedesignRequest } from "./types";

/*
 * OpenRouter — Unified Image API (img2img / editing). Sends the source room
 * photo as a base64 data URL in `input_references` and gets the restyled image
 * back as base64. Default model is FLUX.2 [klein] 4B — verified ~$0.016/image
 * with excellent room-geometry preservation, the best quality under budget.
 * Override via OPENROUTER_IMAGE_MODEL (e.g. google/gemini-3.1-flash-image for
 * higher quality at ~$0.068/image). Endpoint: POST /api/v1/images.
 *
 * The incoming bytes are ALREADY normalized/downscaled by AiService
 * (image-preprocess.ts) — this provider just encodes and sends them.
 *
 * Requires a loaded credit balance — OpenRouter has no free image tier and
 * returns 402 on an empty balance. Skipped if the key isn't set.
 */
const DEFAULT_MODEL = "black-forest-labs/flux.2-klein-4b";
const ENDPOINT = "https://openrouter.ai/api/v1/images";

type ImageEditResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
  usage?: { cost?: number };
};

export const openrouterProvider: AiProvider = {
  key: "openrouter",
  label: "OpenRouter (FLUX.2 klein)",
  model: env.OPENROUTER_IMAGE_MODEL || DEFAULT_MODEL,

  isReady() {
    return Boolean(env.OPENROUTER_API_KEY);
  },

  async redesign(req: RedesignRequest): Promise<RedesignProviderResult> {
    // Bytes are pre-normalized by AiService — just encode as a data URL.
    const dataUrl = `data:${req.imageMime};base64,${req.imageBytes.toString("base64")}`;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Optional attribution headers OpenRouter recommends.
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Home AI",
      },
      body: JSON.stringify({
        model: this.model,
        prompt: req.prompt,
        input_references: [{ type: "image_url", image_url: { url: dataUrl } }],
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      logger.warn({ provider: "openrouter", status: res.status, detail }, "provider failed");
      throw new Error(`openrouter HTTP ${res.status}`);
    }

    const json = (await res.json()) as ImageEditResponse;
    if (json.error?.message) throw new Error(`openrouter: ${json.error.message}`);

    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("openrouter returned no image");

    return { bytes: Buffer.from(b64, "base64"), costUsd: json.usage?.cost ?? null };
  },
};
