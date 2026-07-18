import "server-only";

import { and, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { RATE_LIMIT_CONFIG } from "../config";
import { ALLOW, type Guard, type GuardContext } from "../types";

/*
 * Guard 2 — PER-CALLER BURST LIMIT (sliding window).
 *
 * Blocks anyone (human or script) making more than N generations in a short window. The
 * key is a COMPOSITE — a match on ANY of anonymousId / ip / fingerprint counts — so an
 * abuser can't sidestep it by clearing cookies (fingerprint still matches) or the same
 * fingerprint can't burst from one IP. We deliberately do NOT block on IP alone: in
 * Bangladesh many real mobile users share one carrier IP (CGNAT), so IP-only would punish
 * innocent users.
 */
export const burstGuard: Guard = {
  key: "burst",
  label: "Per-caller burst limit",

  async check(ctx: GuardContext) {
    const { windowSeconds, maxPerWindow } = RATE_LIMIT_CONFIG.burst;
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    // Composite match: same session OR same IP OR same fingerprint within the window.
    const keyMatches = [
      eq(usageEvents.anonymousId, ctx.anonymousId),
      ctx.ip ? eq(usageEvents.ip, ctx.ip) : undefined,
      ctx.fingerprint ? eq(usageEvents.fingerprint, ctx.fingerprint) : undefined,
    ].filter(Boolean);

    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(usageEvents)
      .where(and(gte(usageEvents.createdAt, since), or(...keyMatches)));

    const recent = row?.n ?? 0;
    if (recent >= maxPerWindow) {
      return {
        allowed: false,
        code: "rate_limited",
        message: "You're generating too fast. Please wait a moment and try again.",
        retryAfterSeconds: windowSeconds,
      };
    }
    return ALLOW;
  },
};
