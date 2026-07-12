/**
 * Cloudflare Workers AI — Stable Diffusion 1.5 img2img.
 *
 * Kept as a second, DIFFERENT-shaped adapter so this folder demonstrates the
 * pattern: SD-1.5 uses a JSON body (image_b64) and returns RAW PNG bytes,
 * whereas FLUX klein uses multipart form-data and returns JSON base64. Both hide
 * behind the same ImageModelAdapter interface — that's the whole point.
 *
 * Older/weaker model; not registered by default. Enable it in registry.ts if you
 * want a side-by-side comparison. Same Cloudflare credentials.
 */

import type { ImageModelAdapter, RoomImage } from "./types";

const MODEL = "@cf/runwayml/stable-diffusion-v1-5-img2img";

export const cloudflareSd15: ImageModelAdapter = {
  key: "cf-sd15",
  label: "Cloudflare Stable Diffusion 1.5",

  isReady() {
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return {
        ok: false,
        reason: "set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env",
      };
    }
    return { ok: true };
  },

  async redesign(prompt: string, room: RoomImage): Promise<Buffer> {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_b64: room.bytes.toString("base64"),
        strength: 0.7,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return Buffer.from(await res.arrayBuffer()); // raw PNG
  },
};
