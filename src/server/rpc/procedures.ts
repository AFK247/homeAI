import "server-only";

import { os } from "@orpc/server";

/*
 * oRPC procedures (plan §5.3), adapted: auth is deferred, so we run
 * anonymous-first. Every request carries an `anonymousId` (from a cookie the
 * handler resolves) which scopes all rows until real auth lands.
 *
 * context shape is set by the fetch handler in api/rpc/[[...rest]]/route.ts.
 */

export interface RpcContext {
  /** Anonymous session id (cookie-backed). Scopes designs/events pre-auth. */
  anonymousId: string;
  /** Real user id once auth exists. Null for now. */
  userId: string | null;
}

/** Base builder carrying our context type. */
export const base = os.$context<RpcContext>();

/**
 * publicProcedure — no auth required. Available to anonymous sessions.
 * (protectedProcedure will be added when Better Auth is wired.)
 */
export const publicProcedure = base;
