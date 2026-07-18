import "server-only";

import { headers } from "next/headers";
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
