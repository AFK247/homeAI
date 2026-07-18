import "server-only";

import { createRouterClient } from "@orpc/server";
import { createId } from "@paralleldrive/cuid2";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { AuthUser, RpcContext } from "./procedures";
import { webRouter } from "./router";

/*
 * serverRpc (plan §5.4) — in-process client for Server Components. No HTTP.
 * Resolves the same context as the fetch handler (anon id + auth user) so reads are
 * scoped and admin server-component reads pass the admin check.
 *
 * Usage:  const design = await serverRpc.design.getById({ id })
 */

const ANON_COOKIE = "anon_id";

async function serverContext(): Promise<RpcContext> {
  const store = await cookies();
  // Server Components can't set cookies during render; read-only here. If no
  // anon cookie yet, use a throwaway id (nothing will match — expected for a
  // fresh visitor with no designs).
  const anonymousId = store.get(ANON_COOKIE)?.value ?? createId();

  const session = await auth.api.getSession({ headers: await headers() });
  const u = session?.user as (AuthUser & { role?: string }) | undefined;
  const user: AuthUser | null = u ? { id: u.id, email: u.email, role: u.role ?? "user" } : null;

  return { anonymousId, user };
}

export const serverRpc = createRouterClient(webRouter, {
  context: serverContext,
});
