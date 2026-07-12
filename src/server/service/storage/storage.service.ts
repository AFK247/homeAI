import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

/*
 * Object storage service — S3-compatible. Points at local MinIO now; the same
 * code works against Cloudflare R2 or Supabase Storage in production (just swap
 * the S3_* env vars). Services call `put()` and get back a public URL.
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
  /** Upload bytes under `key`, return the public URL for reading it. */
  put: async (key: string, bytes: Buffer, contentType: string): Promise<string> => {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: contentType,
      }),
    );
    return `${env.S3_PUBLIC_URL}/${key}`;
  },
};
