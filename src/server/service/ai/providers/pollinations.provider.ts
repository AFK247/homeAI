import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { AiProvider, RedesignRequest } from "./types";

/*
 * Pollinations — FLUX Kontext (img2img). Fetches the source image by PUBLIC URL
 * and returns the transformed image bytes. The kontext model needs a free
 * publishable key (pk_) from enter.pollinations.ai — no card. Provider is
 * skipped if the key isn't set.
 *
 * NOTE: Pollinations fetches `imageUrl` from its own servers, so that URL must
 * be publicly reachable (fine with an R2 public URL in production; a localhost
 * MinIO URL will not resolve for them in local dev).
 */
const MODEL = "kontext";

export const pollinationsProvider: AiProvider = {
  key: "pollinations",
  label: "Pollinations (FLUX Kontext)",
  model: MODEL,

  isReady() {
    return Boolean(env.POLLINATIONS_API_KEY);
  },

  async redesign(req: RedesignRequest): Promise<Buffer> {
    const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(req.prompt)}`);
    url.searchParams.set("model", MODEL);
    url.searchParams.set("image", req.imageUrl);
    url.searchParams.set("nologo", "true");

    const res = await fetch(url, {
      headers: env.POLLINATIONS_API_KEY
        ? { Authorization: `Bearer ${env.POLLINATIONS_API_KEY}` }
        : undefined,
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      logger.warn({ provider: "pollinations", status: res.status, detail }, "provider failed");
      throw new Error(`pollinations HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new Error(`pollinations returned non-image (${contentType})`);
    }
    return Buffer.from(await res.arrayBuffer());
  },
};
