import "server-only";

import sharp from "sharp";
import type { InputSpec } from "./providers/types";

/*
 * Shared image preprocessing for AI redesign — run ONCE upstream of the provider
 * chain (in AiService). Produces a normalized BASE image every provider starts
 * from, so normalization (rotation/format/orientation) is consistent.
 *
 * Operations:
 *  - EXIF auto-rotate (phone photos carry orientation in metadata)
 *  - downscale the longest edge to MAX_EDGE (bounds model input tokens / cost;
 *    a room photo does not need to be 4K for the model to restyle it)
 *  - flatten transparency onto white (models expect opaque RGB)
 *  - re-encode as clean JPEG (strips metadata, normalizes the container)
 *
 * NOTE: a provider with a STRICTER input requirement (e.g. Cloudflare klein
 * needs input < 512x512) does its own additional resize from this base — that
 * model-specific constraint lives in the provider, not here.
 */

const DEFAULT_MAX_EDGE = 1536; // longest edge when a provider declares no cap
const DEFAULT_QUALITY = 90;

export interface ImageDims {
  width: number;
  height: number;
  bytes: number;
  // megapixels is NOT stored — derive it as width*height/1e6 where needed.
}

export interface PreparedImage {
  bytes: Buffer;
  mime: "image/jpeg" | "image/png";
  /** Dimensions of the normalized image actually sent to the model. */
  dims: ImageDims;
}

/**
 * Normalize a raw uploaded image into a model-ready image, honouring an optional
 * provider InputSpec (max edge / format / quality). Same base pipeline for
 * every model — rotate, downscale, flatten, re-encode — parameterized by the
 * spec so a new model with custom input needs just passes its spec (no bespoke
 * resize code in the provider). Idempotent; throws if the input isn't decodable.
 */
export async function preprocessForModel(
  input: Buffer,
  spec?: InputSpec,
): Promise<PreparedImage> {
  const maxEdge = spec?.maxEdge ?? DEFAULT_MAX_EDGE;
  const format = spec?.format ?? "image/jpeg";
  const quality = spec?.quality ?? DEFAULT_QUALITY;

  let pipeline = sharp(input)
    .rotate() // apply EXIF orientation, then drop it
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" });
  pipeline = format === "image/png" ? pipeline.png() : pipeline.jpeg({ quality });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  return {
    bytes: data,
    mime: format,
    dims: { width: info.width, height: info.height, bytes: data.length },
  };
}

/** Measure an arbitrary image buffer (e.g. the model's output) for logging. */
export async function measureImage(buf: Buffer): Promise<ImageDims> {
  const meta = await sharp(buf).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0, bytes: buf.length };
}
