import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { cloudflareNeuronQuota } from "./cloudflare/analytics";
import type { AiProvider, RedesignProviderResult, RedesignRequest } from "./types";

/*
 * Cloudflare Workers AI — FLUX.2 [klein] 9B (img2img). Multipart in, JSON base64
 * out. Free daily neuron allocation; throws 429 when exhausted (→ chain falls
 * through to the next provider).
 *
 * Uses the 4B klein (not 9B): ~14x cheaper for img2img — billed per 512x512
 * TILE (5.37 N/input tile + 26.05 N/output tile ≈ 110 N ≈ $0.0012/image, ~91
 * free/day) vs 9B's per-MP pricing (~1545 N ≈ $0.017, ~6 free/day). Same img2img
 * support and FLUX.2 quality; 9B only adds marginal quality for 14x the cost.
 *
 * MODEL-SPECIFIC NOTES:
 *  - input_image_N MUST be < 512x512 for klein. This is declared via `inputSpec`
 *    below; the shared preprocessor conforms the image to it before redesign()
 *    is called (no resize code lives here).
 *  - `steps` is FIXED (distilled) — not settable, so we don't send it.
 *  - Output 1024x1024 keeps the tile count (and cost) predictable.
 */
const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const OUTPUT_SIZE = 1024; // 4 output tiles — predictable cost

export const cloudflareProvider: AiProvider = {
  key: "cloudflare",
  label: "Cloudflare (FLUX.2 klein 4B)",
  model: MODEL,
  // klein requires input images < 512x512 — 504 is the largest multiple of 8 under it.
  inputSpec: { maxEdge: 504, format: "image/jpeg", quality: 90 },

  isReady() {
    return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
  },

  async balance() {
    // Cloudflare Workers AI has no queryable $ balance — it's a free Neuron
    // allocation (see quota()) and then $0.011/1000 Neurons.
    return { display: "free quota", remaining: null };
  },

  async quota() {
    return cloudflareNeuronQuota();
  },

  async redesign(req: RedesignRequest): Promise<RedesignProviderResult> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

    // req.imageBytes already conforms to inputSpec (< 512px) via the registry.
    const form = new FormData();
    form.append("prompt", req.prompt);
    form.append("width", String(OUTPUT_SIZE));
    form.append("height", String(OUTPUT_SIZE));
    form.append(
      "input_image_0",
      new Blob([new Uint8Array(req.imageBytes)], { type: req.imageMime }),
      "room",
    );

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      body: form,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      logger.warn({ provider: "cloudflare", status: res.status, detail }, "provider failed");
      throw new Error(`cloudflare HTTP ${res.status}`);
    }
    const json = (await res.json()) as { result?: { image?: string } };
    const b64 = json.result?.image;
    if (!b64) throw new Error("cloudflare returned no image");
    // Cloudflare returns no per-call cost. The REAL Neuron consumption is read
    // (aggregated) from the analytics API — see cloudflare-analytics.ts, shown
    // on the admin provider/generations pages. No per-call estimate here.
    return { bytes: Buffer.from(b64, "base64"), costUsd: null };
  },
};
