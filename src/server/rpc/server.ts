import "server-only";

import { createRouterClient } from "@orpc/server";
import { createId } from "@paralleldrive/cuid2";
import { cookies } from "next/headers";
import type { RpcContext } from "./procedures";
import { webRouter } from "./router";

/*
 * serverRpc (plan §5.4) — in-process client for Server Components. No HTTP.
 * Resolves the same anonymous context as the fetch handler so reads are scoped.
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
  return { anonymousId, userId: null };
}

export const serverRpc = createRouterClient(webRouter, {
  context: serverContext,
});
