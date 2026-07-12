import { z } from "zod";

/*
 * Zod-validated environment module (§0b). Parses process.env at boot and fails fast
 * with a clear error if a required key is missing. Import `env` instead of process.env.
 *
 * During the frontend-first (mock-data) stage most of these are optional; they become
 * required as the backend (Stage D) is wired in. Tighten `.optional()` → required then.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database (Postgres) — pooled at runtime, direct for migrations. Required
  // now that the backend is wired (local Docker or Supabase).
  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: z.url().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // AI provider (Fal now; provider-abstracted)
  FAL_KEY: z.string().optional(),

  // AI (Cloudflare Workers AI — FLUX.2 klein, img2img)
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),

  // Object storage (S3-compatible: local MinIO now, R2/Supabase in prod)
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_PUBLIC_URL: z.url(),

  // Cloudflare R2 (production storage — optional; unused locally)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.url().optional(),

  // Payments (SSLCommerz)
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  SSLCOMMERZ_IS_LIVE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Email
  RESEND_API_KEY: z.string().optional(),

  // Cron auth (protects /api/cron/*)
  CRON_SECRET: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown>): z.infer<T> {
  // Treat blank env vars (KEY= with no value) as absent, so .optional() applies
  // instead of failing on an empty string.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v !== "") cleaned[k] = v;
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`❌ Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

// Client vars are safe on both sides; server vars only parsed on the server.
export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export const env =
  typeof window === "undefined"
    ? { ...parse(serverSchema, process.env), ...clientEnv }
    : (clientEnv as z.infer<typeof serverSchema> & z.infer<typeof clientSchema>);
