/**
 * Cloudflare Workers AI — FLUX.2 [klein] 9B (img2img editing).
 *
 * Modern 2026 model on Cloudflare's free tier (~20–50 images/day). Confirmed
 * working. Multipart form-data in, JSON base64 out.
 *
 * Env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (Workers AI: Read + Edit).
 */

import type { ImageModelAdapter, RoomImage } from "./types";

const MODEL = "@cf/black-forest-labs/flux-2-klein-9b";

export const cloudflareFluxKlein: ImageModelAdapter = {
  key: "cf-flux-klein",
  label: "Cloudflare FLUX.2 klein 9B",

  isReady() {
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return {
        ok: false,
        reason:
          "set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in .env (Workers AI token)",
      };
    }
    return { ok: true };
  },

  async redesign(prompt: string, room: RoomImage): Promise<Buffer> {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const token = process.env.CLOUDFLARE_API_TOKEN;
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`;

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("steps", "4"); // distilled — fixed at 4
    form.append(
      "input_image_0",
      new Blob([new Uint8Array(room.bytes)], { type: room.mime }),
      "room",
    );

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const json = (await res.json()) as { result?: { image?: string } };
    const b64 = json.result?.image;
    if (!b64) {
      throw new Error(`no image in response: ${JSON.stringify(json).slice(0, 200)}`);
    }
    return Buffer.from(b64, "base64");
  },
};
