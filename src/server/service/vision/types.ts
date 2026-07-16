import "server-only";

/*
 * The one interface every furniture-tagging provider implements. Adding a provider =
 * a new file in ./providers implementing this, then registering it in the chain
 * (registry.ts). TagService only ever talks to this interface — nothing outside
 * ./providers may name a vendor.
 *
 * Mirrors the image-generation registry in ../ai/providers deliberately: same shape,
 * same fallback semantics, same "declare capabilities, don't branch on vendor" rule.
 */

/** One detected furniture item, normalised across providers. */
export interface DetectedTag {
  /** Furniture word ("sofa") — becomes the pin label. */
  label: string;
  /** Centre of the item, 0..100 % of image width/height. */
  xPct: number;
  yPct: number;
  /** Box area as a fraction (0..1) of the image — used to rank and de-speck. */
  areaFrac: number;
  /** Normalised box [x1,y1,x2,y2] in 0..1 — used to de-duplicate overlaps. */
  box: [number, number, number, number];
}

export interface DetectRequest {
  imageBytes: Buffer;
  imageMime: string;
  /** The furniture words to look for (see ../targets.ts). */
  targets: string[];
}

export interface TagProvider {
  /** Stable id (persisted / shown in admin). */
  readonly key: string;
  /** Human-readable provider name. */
  readonly label: string;
  /** Model id this provider uses. */
  readonly model: string;
  /**
   * How the provider consumes `targets`.
   *  - "per-target": the model grounds ONE phrase per call, so the registry fans out
   *    one call per target and merges (e.g. moondream's `detect`).
   *  - "batch": the model accepts the whole list in a single call.
   * Declaring this keeps the fan-out decision out of the provider.
   */
  readonly targetMode: "per-target" | "batch";
  /** True when configured (keys present) and usable. Skipped if not ready. */
  isReady(): boolean;
  /**
   * Detect furniture. For "per-target" providers the registry calls this once per
   * target with a single-element `targets`. Throws on failure so the chain falls
   * through to the next provider.
   */
  detect(req: DetectRequest): Promise<DetectedTag[]>;
}
