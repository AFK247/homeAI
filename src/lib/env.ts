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
  // Admin seed (scripts/seed-admin.ts) — the first admin account, created idempotently.
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /*
   * AI provider credentials. EVERY provider's keys are optional: each provider's
   * isReady() checks its own keys and the chain skips it when absent, so a provider
   * can be added, removed or swapped by editing the chain alone — never this file's
   * required/optional shape. (Requiring one vendor's keys here would hard-crash the
   * app at boot the moment you drop that provider.) At least one provider must be
   * configured at runtime, which redesignWithFallback enforces with a clear error.
   */
  FAL_KEY: z.string().optional(),

  // Cloudflare Workers AI — image generation (FLUX.2 klein) + vision tagging
  // (moondream). Both share one free Neuron allocation.
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),

  // OpenRouter Unified Image API — img2img via Gemini flash / FLUX / Seedream.
  // Pay-as-you-go key (sk-or-v1-...) from openrouter.ai/keys; balance required (no
  // free image tier). Without it the provider is skipped.
  OPENROUTER_API_KEY: z.string().optional(),

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

  // Email (Resend). RESEND_API_KEY optional — when absent, transactional email is skipped
  // (logged) instead of crashing, so local dev works without it. EMAIL_FROM is the verified
  // sender address; defaults to a Resend sandbox address for local testing.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Home AI <onboarding@resend.dev>"),

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
