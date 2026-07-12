import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AiProvider, RedesignRequest } from "./types";

/*
 * Cloudflare Workers AI — FLUX.2 [klein] 9B (img2img). Multipart in, JSON base64
 * out. Free daily neuron allocation; throws 429 when exhausted (→ chain falls
 * through to the next provider).
 */
const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

export const cloudflareProvider: AiProvider = {
  key: "cloudflare",
  label: "Cloudflare Workers AI",
  model: MODEL,

  isReady() {
    return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
  },

  async redesign(req: RedesignRequest): Promise<Buffer> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;
    const form = new FormData();
    form.append("prompt", req.prompt);
    form.append("steps", "4"); // distilled — fixed
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
    return Buffer.from(b64, "base64");
  },
};
