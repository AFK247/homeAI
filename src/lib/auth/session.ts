import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { accounts } from "@/db/schemas/auth.schema";
import { auth } from "./auth";

/*
 * Server-side session helpers. Read the current session in server components, route
 * handlers, and the admin guard. `getSession` returns null when signed out (anonymous).
 */

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** The signed-in user, or null. */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** True when the current user is an admin (role === "admin"). */
export async function isAdmin() {
  const user = await getCurrentUser();
  return (user as { role?: string } | null)?.role === "admin";
}

/**
 * Does this user have an email/password credential? Social-only users (Google/Facebook)
 * don't, so the account page hides the change-password section for them. Detected by a
 * `credential` provider row in the accounts table.
 */
export async function hasPasswordCredential(userId: string): Promise<boolean> {
  const rows = await db
    .select({ providerId: accounts.providerId })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  return rows.some((r) => r.providerId === "credential");
}
