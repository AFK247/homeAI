import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/*
 * Object storage service — S3-compatible. Points at local MinIO now; the same
 * code works against Cloudflare R2 or Supabase Storage in production (just swap
 * the S3_* env vars).
 *
 * URL CONVENTION: `put()` stores the object and returns its KEY (the stable
 * path, e.g. "originals/anon_x/123.jpg") — NOT a full URL. Only the key is
 * persisted in the DB. The public base URL (S3_PUBLIC_URL) is env-specific and
 * changeable, so the full URL is built at READ time via `publicUrl(key)`. This
 * way switching storage/domain never invalidates stored rows.
 */

const globalForS3 = globalThis as unknown as { __homeaiS3__?: S3Client };

const s3 =
  globalForS3.__homeaiS3__ ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true, // required for MinIO / R2 S3 compatibility
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

if (env.NODE_ENV !== "production") {
  globalForS3.__homeaiS3__ = s3;
}

export const StorageService = {
  /** Upload bytes under `key`; returns the stored KEY (not a URL). */
  put: async (key: string, bytes: Buffer, contentType: string): Promise<string> => {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return key;
  },

  /**
   * Build the full public URL for a stored key at read time. Pass-through for
   * values that are already absolute URLs (e.g. legacy rows) or empty.
   */
  publicUrl: (key: string | null | undefined): string | null => {
    if (!key) return null;
    if (key.startsWith("http://") || key.startsWith("https://")) return key;
    return `${env.S3_PUBLIC_URL}/${key.replace(/^\/+/, "")}`;
  },
};
