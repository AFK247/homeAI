import "server-only";

import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AI_PROVIDER } from "./provider-info";

/*
 * AI redesign service — Cloudflare Workers AI, FLUX.2 [klein] 9B (img2img).
 *
 * Synchronous: one call returns the redesigned image bytes. Provider details
 * (endpoint, multipart shape, response parsing) are isolated here — swapping to
 * Fal/Replicate later is a change to this file only. The redesign PROMPT is
 * assembled server-side and kept private (PROJECT_CONTEXT §12). The active
 * provider/model is declared in provider-info.ts (also shown in admin).
 */

const MODEL = AI_PROVIDER.modelId;

const RULES =
  "You are redesigning THIS actual room. Preserve the existing architecture " +
  "exactly: keep the real wall positions, window and door locations, ceiling " +
  "height, and room proportions. Only restyle furniture, decor, textiles, " +
  "lighting, and finishes. Photorealistic, same camera angle.";

// Style → BD-authentic direction, keyed by the DESIGN_STYLES enum. Kept private
// (trade-secret prompts — PROJECT_CONTEXT §12).
const STYLE_DIRECTION: Record<DesignStyle, string> = {
  modern:
    "warm modern middle-class Bangladeshi living space, rich wooden furniture " +
    "(Hatil/Otobi teak tones), large family seating, jute rugs, warm lighting.",
  traditional_bangla:
    "traditional Bengali heritage: carved dark wood, divan with bolster cushions, " +
    "terracotta and brass accents, nakshi kantha textiles.",
  minimal:
    "clean contemporary Dhaka apartment, neutral walls, comfortable large sofa " +
    "set, local wooden coffee table, subtle brass accents, warm daylight.",
  luxury:
    "upscale Bangladeshi interior, premium wood and marble, elegant large-family " +
    "seating, refined warm lighting, tasteful local motifs.",
  scandinavian:
    "light Scandinavian-influenced but liveable Dhaka home: pale woods, soft " +
    "neutral textiles, uncluttered warmth, practical family seating.",
  classic:
    "classic elegant Bangladeshi interior: timeless wooden furniture, symmetrical " +
    "layout, warm ambient lighting, refined but comfortable for a large family.",
};

function buildPrompt(style: DesignStyle, _roomType: RoomType, userPrompt?: string | null): string {
  const direction = STYLE_DIRECTION[style];
  const extra = userPrompt ? ` Additional request: ${userPrompt}.` : "";
  return `${RULES}\n\nRedesign as: ${direction}${extra}`;
}

export interface RedesignInput {
  imageBytes: Buffer;
  imageMime: string;
  style: DesignStyle;
  roomType: RoomType;
  userPrompt?: string | null;
}

export const AiService = {
  /** Run img2img and return the generated PNG bytes. Throws on failure. */
  redesign: async (input: RedesignInput): Promise<Buffer> => {
    const prompt = buildPrompt(input.style, input.roomType, input.userPrompt);
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("steps", String(AI_PROVIDER.steps)); // distilled — fixed
    form.append(
      "input_image_0",
      new Blob([new Uint8Array(input.imageBytes)], { type: input.imageMime }),
      "room",
    );

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` },
      body: form,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      logger.error({ status: res.status, detail }, "cloudflare redesign failed");
      throw new Error(`AI redesign failed (HTTP ${res.status})`);
    }
    const json = (await res.json()) as { result?: { image?: string } };
    const b64 = json.result?.image;
    if (!b64) {
      logger.error({ json }, "cloudflare redesign: no image in response");
      throw new Error("AI redesign returned no image");
    }
    return Buffer.from(b64, "base64");
  },
};
