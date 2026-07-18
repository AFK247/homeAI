import "server-only";

import { ORPCError, os } from "@orpc/server";

/*
 * oRPC procedures (plan §5.3). Three tiers of access:
 *
 *  - publicProcedure     — anyone (anonymous or logged-in). Used by the user-facing
 *                          generate/browse flow. ALWAYS scope queries by `anonymousId`
 *                          (or `user.id` when logged in) so sessions can't cross.
 *  - protectedProcedure  — requires a logged-in user (for save/account features).
 *  - adminProcedure      — requires a logged-in user with role === "admin". Every admin
 *                          router uses this, so the API rejects non-admins server-side —
 *                          not just the /admin UI.
 *
 * The context (anonymousId + the resolved auth user) is built by the fetch handler
 * (api/rpc/[[...rest]]/route.ts) and the in-process server client (server.ts).
 */

export interface AuthUser {
  id: string;
  role: string;
  email: string;
}

export interface RpcContext {
  /** Anonymous session id (cookie-backed). Scopes designs/events for logged-out users. */
  anonymousId: string;
  /** The signed-in user, or null when anonymous. */
  user: AuthUser | null;
}

/** Base builder carrying our context type. */
export const base = os.$context<RpcContext>();

/** publicProcedure — no auth required. Available to anonymous sessions. */
export const publicProcedure = base;

/** protectedProcedure — requires a logged-in user. Narrows ctx.user to non-null. */
export const protectedProcedure = base.use(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in required." });
  }
  return next({ context: { ...context, user: context.user } });
});

/** adminProcedure — requires a logged-in user with role === "admin". */
export const adminProcedure = base.use(({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in required." });
  }
  if (context.user.role !== "admin") {
    throw new ORPCError("FORBIDDEN", { message: "Admin access required." });
  }
  return next({ context: { ...context, user: context.user } });
});
