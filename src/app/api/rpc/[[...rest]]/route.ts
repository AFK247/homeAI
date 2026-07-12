import { RPCHandler } from "@orpc/server/fetch";
import { createId } from "@paralleldrive/cuid2";
import { cookies } from "next/headers";
import type { RpcContext } from "@/server/rpc/procedures";
import { webRouter } from "@/server/rpc/router";

/*
 * oRPC fetch handler (plan §5.4). Serves the whole webRouter at /api/rpc.
 *
 * Anonymous-first: resolves (or mints) an `anon_id` cookie and passes it as
 * context.anonymousId so every request is scoped without login.
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
  return { anonymousId, userId: null };
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
