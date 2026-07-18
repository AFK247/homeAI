import "server-only";

import { ORPCError } from "@orpc/server";
import { env } from "@/lib/env";

/*
 * Guard for LOCAL-OPERATOR-ONLY endpoints (the catalog scraper + ingest). These run heavy
 * work — Playwright, long-lived HTTP loops — that cannot execute on a serverless production
 * host and must never be triggered there. Every such route/procedure calls this first.
 *
 * Throws (oRPC) when not in development. `isLocal()` is the boolean form for route handlers
 * and UI gating.
 */
export function isLocal(): boolean {
  return env.NODE_ENV === "development";
}

export function assertLocalOnly(): void {
  if (!isLocal()) {
    throw new ORPCError("FORBIDDEN", {
      message: "This operation is only available in local development.",
    });
  }
}
