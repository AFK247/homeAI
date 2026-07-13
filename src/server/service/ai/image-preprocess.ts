import "server-only";

import sharp from "sharp";

/*
 * Shared image preprocessing for AI redesign — run ONCE upstream of the provider
 * chain (in AiService), so every provider receives an identical, already-
 * normalized image. Providers must NOT preprocess; their job is only to call
 * their model. This keeps preprocessing consistent (and cost predictable)
 * regardless of which provider the fallback chain ends up using.
 *
 * Operations:
 *  - EXIF auto-rotate (phone photos carry orientation in metadata)
 *  - downscale the longest edge to MAX_EDGE (bounds model input tokens / cost;
 *    a room photo does not need to be 4K for the model to restyle it)
 *  - flatten transparency onto white (models expect opaque RGB)
 *  - re-encode as clean JPEG (strips metadata, normalizes the container)
 */

const MAX_EDGE = 1536; // longest edge sent to any model
const JPEG_QUALITY = 90;

export interface PreparedImage {
  bytes: Buffer;
  mime: "image/jpeg";
}

/**
 * Normalize a raw uploaded image into a model-ready JPEG. Idempotent and
 * provider-agnostic. Throws if the input is not a decodable image.
 */
export async function preprocessForModel(input: Buffer): Promise<PreparedImage> {
  const bytes = await sharp(input)
    .rotate() // apply EXIF orientation, then drop it
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  return { bytes, mime: "image/jpeg" };
}
