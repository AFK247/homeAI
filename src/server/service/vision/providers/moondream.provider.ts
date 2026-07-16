import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { DetectedTag, DetectRequest, TagProvider } from "../types";

/*
 * Cloudflare Workers AI — moondream 3.1 (9B-A2B). Vision grounding: given ONE object
 * phrase it returns real bounding boxes.
 *
 * MODEL-SPECIFIC NOTES (all live-measured — see docs/model-price.md):
 *  - `task: "detect"` runs the vision grounding head and MEASURES pixels. `task:
 *    "query"` runs the language model, which HALLUCINATES coordinates (in testing it
 *    echoed the example values from the prompt). Only `detect` is used here.
 *  - `detect` grounds ONE phrase per call: "sofa, table, tv" matches only the first
 *    word, and a generic "furniture" finds almost nothing. Hence targetMode
 *    "per-target" — the registry does the fan-out, not this file.
 *  - Cost: ~20.7 Neurons (~$0.0002) and ~2.4s per target, against Cloudflare's
 *    10k/day free Neuron allocation.
 */

const MODEL = "@cf/moondream/moondream3.1-9B-A2B";
const TIMEOUT_MS = 20_000;

/** Boxes come back normalised 0..1. */
const DetectResponse = z.object({
  success: z.boolean(),
  result: z
    .object({
      result: z
        .object({
          objects: z
            .array(
              z.object({
                x_min: z.number(),
                y_min: z.number(),
                x_max: z.number(),
                y_max: z.number(),
              }),
            )
            .nullable()
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const moondreamProvider: TagProvider = {
  key: "moondream",
  label: "Cloudflare (moondream 3.1)",
  model: MODEL,
  targetMode: "per-target",

  isReady() {
    return Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);
  },

  async detect(req: DetectRequest): Promise<DetectedTag[]> {
    const target = req.targets[0];
    if (!target) return [];

    const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // Sent inline as a data URI: we already hold the bytes, and this avoids requiring
    // storage to be publicly reachable from Cloudflare.
    const image = `data:${req.imageMime};base64,${req.imageBytes.toString("base64")}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ task: "detect", image, target, stream: false }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      // 429 = the daily free Neuron allocation is spent (rolling 24h, not midnight).
      throw new Error(`moondream HTTP ${res.status}`);
    }

    const parsed = DetectResponse.safeParse(await res.json());
    if (!parsed.success) {
      logger.warn({ err: parsed.error }, "moondream response failed validation");
      return [];
    }
    if (!parsed.data.success) return [];

    return (parsed.data.result?.result?.objects ?? []).map((o) => ({
      label: target,
      xPct: ((o.x_min + o.x_max) / 2) * 100,
      yPct: ((o.y_min + o.y_max) / 2) * 100,
      areaFrac: (o.x_max - o.x_min) * (o.y_max - o.y_min),
      box: [o.x_min, o.y_min, o.x_max, o.y_max] as [number, number, number, number],
    }));
  },
};
