import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AiProvider, RedesignProviderResult, RedesignRequest } from "./types";

/*
 * OpenRouter — Unified Image API (img2img / editing). Sends the source room
 * photo as a base64 data URL in `input_references` and gets the restyled image
 * back as base64. Model is FLUX.2 [klein] 4B — verified ~$0.016/image with excellent
 * room-geometry preservation, the best quality under budget. Endpoint: POST /api/v1/images.
 *
 * The incoming bytes are ALREADY normalized/downscaled by AiService
 * (image-preprocess.ts) — this provider just encodes and sends them.
 *
 * Requires a loaded credit balance — OpenRouter has no free image tier and
 * returns 402 on an empty balance. Skipped if the key isn't set.
 */
const MODEL = "black-forest-labs/flux.2-klein-4b";
const ENDPOINT = "https://openrouter.ai/api/v1/images";

type ImageEditResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
  usage?: { cost?: number };
};

/** Remaining OpenRouter balance in USD via the free /credits endpoint. Throws on HTTP error. */
async function fetchRemaining(): Promise<number | null> {
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    cache: "no-store", // live balance — never cached
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
  const { total_credits, total_usage } = json.data ?? {};
  return total_credits != null && total_usage != null ? total_credits - total_usage : null;
}

export const openrouterProvider: AiProvider = {
  key: "openrouter",
  label: "OpenRouter (FLUX.2 klein)",
  model: MODEL,

  isReady() {
    // Disabled for now — we run Cloudflare only. Even with a key present, OpenRouter is
    // NOT used (kept in the codebase for a future paid fallback). Flip this to
    // `Boolean(env.OPENROUTER_API_KEY)` to re-enable it in the chain + admin.
    return false;
  },

  async balance() {
    if (!env.OPENROUTER_API_KEY) return { display: "not configured", remaining: null };
    try {
      const remaining = await fetchRemaining();
      return remaining != null
        ? { display: `$${remaining.toFixed(2)}`, remaining }
        : { display: "reachable", remaining: null };
    } catch {
      return { display: "unavailable", remaining: null };
    }
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
