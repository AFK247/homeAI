import "server-only";

import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";

/*
 * The one interface every AI image provider implements. Adding a provider = a
 * new file in this folder implementing this, then registering it in the chain
 * (registry.ts). The AI service only ever talks to this interface.
 */

export interface RedesignRequest {
  imageBytes: Buffer;
  imageMime: string;
  /** Public URL of the source image (some providers fetch by URL, not bytes). */
  imageUrl: string;
  /** Server-assembled, private redesign prompt. */
  prompt: string;
  style: DesignStyle;
  roomType: RoomType;
}

export interface RedesignResult {
  /** The generated image bytes (PNG/JPEG). */
  bytes: Buffer;
  /** The provider + model that produced it (persisted on the design). */
  provider: string;
  model: string;
}

export interface AiProvider {
  /** Stable id (persisted, shown in admin). */
  readonly key: string;
  /** Human-readable provider name. */
  readonly label: string;
  /** Model id/name this provider uses. */
  readonly model: string;
  /** True when configured (keys present) and usable. Skipped if not ready. */
  isReady(): boolean;
  /** Run img2img. Throws on failure so the chain falls through to the next. */
  redesign(req: RedesignRequest): Promise<Buffer>;
}
