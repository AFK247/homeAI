import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { cookies } from "next/headers";
import { DesignService } from "@/app/create/_modules/design.service";
import { db } from "@/db/client";
import { accounts, sessions, users, verifications } from "@/db/schemas/auth.schema";
import { sendEmail } from "@/lib/email/resend";
import { resetPasswordEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// Anonymous session cookie — same name the oRPC handler sets (src/app/api/rpc/.../route.ts).
// On signup/login we read it to claim the user's anonymous designs.
const ANON_COOKIE = "anon_id";

/*
 * Claim the current request's anonymous designs for `userId`: read the anon_id cookie and
 * backfill userId onto every not-yet-claimed design made under it. Runs on both signup and
 * login; idempotent, so double-firing (signup also creates a session) is harmless. Fail-open
 * — a claim error must never block auth, so we log and return.
 */
async function claimAnonymousDesigns(userId: string, via: "signup" | "login") {
  try {
    const store = await cookies();
    const anonymousId = store.get(ANON_COOKIE)?.value;
    if (!anonymousId) return;
    const count = await DesignService.claimForUser({ anonymousId, userId });
    if (count > 0) logger.info({ userId, count, via }, "claimed anonymous designs");
  } catch (err) {
    logger.error({ err, userId, via }, "claim anonymous designs failed");
  }
}

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

  emailAndPassword: {
    enabled: true,
    // Forgot-password flow: Better Auth mints a one-time token and calls this with the ready
    // reset URL (points at our /reset-password page via the client's redirectTo). We just
    // deliver it. sendEmail fails-open in dev (logs the link) — see lib/email/resend.ts.
    sendResetPassword: async ({ user, url }) => {
      const { subject, html } = resetPasswordEmail(url);
      await sendEmail({ to: user.email, subject, html });
    },
  },
  socialProviders,

  /*
   * Claim-on-signup: right after a user row is created, backfill our `userId` onto every
   * design the person made anonymously (matched by the `anon_id` cookie on this request).
   * This is what lets us distinguish "a real user's work" (userId set) from "abandoned
   * anonymous renders" (userId null) — the latter being the only ones safe to clean up.
   *
   * Fail-open: a claim failure must never block account creation, so we log and move on.
   * The cookie is read via next/headers since this runs inside the signup request.
   */
  databaseHooks: {
    user: {
      // Signup: a new account is created.
      create: {
        after: async (user) => claimAnonymousDesigns(user.id, "signup"),
      },
    },
    session: {
      // Login: a session is created on every sign-in (and just after signup). Claiming is
      // idempotent (only unclaimed rows), so covering both signup and login is safe and
      // ensures a returning user's anonymous work on this device gets attached to them too.
      create: {
        after: async (session) => claimAnonymousDesigns(session.userId, "login"),
      },
    },
  },

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
