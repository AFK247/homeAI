import { RPCHandler } from "@orpc/server/fetch";
import { createId } from "@paralleldrive/cuid2";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { AuthUser, RpcContext } from "@/server/rpc/procedures";
import { webRouter } from "@/server/rpc/router";

/*
 * oRPC fetch handler (plan §5.4). Serves the whole webRouter at /api/rpc.
 *
 * Builds the request context: the anonymous session id (cookie-backed, so logged-out
 * users are still scoped) AND the resolved Better Auth user (null when anonymous). The
 * procedure tiers (public/protected/admin) enforce access from there.
 */

const handler = new RPCHandler(webRouter);

const ANON_COOKIE = "anon_id";

async function resolveContext(): Promise<RpcContext> {
  const store = await cookies();
  let anonymousId = store.get(ANON_COOKIE)?.value;
  if (!anonymousId) {
    anonymousId = createId();
    store.set(ANON_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  const u = session?.user as (AuthUser & { role?: string }) | undefined;
  const user: AuthUser | null = u ? { id: u.id, email: u.email, role: u.role ?? "user" } : null;

  // Client signals for the abuse guards. IP: the first hop in x-forwarded-for (the real
  // client behind the proxy chain). Fingerprint: a client-sent device hash (ThumbmarkJS).
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const fingerprint = h.get("x-device-fingerprint") || null;

  return { anonymousId, user, ip, fingerprint };
}

async function handle(request: Request): Promise<Response> {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: await resolveContext(),
  });
  return response ?? new Response("Not Found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
