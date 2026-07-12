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

  // Database (Supabase Postgres) — pooled at runtime, direct for migrations
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // AI provider (Fal now; provider-abstracted)
  FAL_KEY: z.string().optional(),

  // Cloudflare R2 (S3-compatible)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

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
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

function parse<T extends z.ZodTypeAny>(schema: T, source: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(source);
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
