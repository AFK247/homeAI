import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schemas/auth.schema";
import { env } from "@/lib/env";

/*
 * Better Auth server instance (Stage D). Anonymous-first stays: login is OPTIONAL — used to
 * save designs and REQUIRED only for /admin. This instance backs the /api/auth handler.
 *
 * Providers are conditional on env keys so the app runs locally without OAuth set up:
 * email/password always on; Google/Facebook only when their client id/secret are present.
 * The `role` field (default "user") gates /admin — set a user's role to "admin" in the DB.
 */

const socialProviders: Parameters<typeof betterAuth>[0]["socialProviders"] = {};
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}
if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
  socialProviders.facebook = {
    clientId: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  secret: env.BETTER_AUTH_SECRET,

  // Map Better Auth to our existing Drizzle tables (singular names, snake_case columns).
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),

  emailAndPassword: { enabled: true },
  socialProviders,

  // Expose our custom `role` column to the session/user object.
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
  },

  // Must be last — lets server actions/route handlers set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
