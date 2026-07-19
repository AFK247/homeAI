import "server-only";

import { and, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { RATE_LIMIT_CONFIG } from "../config";
import { ALLOW, type Guard, type GuardContext } from "../types";

/*
 * Guard 2 — PER-CALLER BURST LIMIT (sliding window).
 *
 * Blocks anyone (human or script) making more than N generations in a short window. The key is
 * a COMPOSITE identity, keyed FINGERPRINT-FIRST to protect shared WiFi (common in BD — a household
 * or CGNAT carrier shares one IP across many real users):
 *   - fingerprint present → match on anonymousId OR fingerprint, and DELIBERATELY NOT on IP. So
 *     housemates on one WiFi (distinct fingerprints) never count against each other; a farmer
 *     clearing cookies on the same device (same fingerprint) still matches.
 *   - fingerprint absent → fall back to anonymousId OR ip (best signal we have).
 * This mirrors the credit anti-farming logic (credit.service.grantAnon) so every abuse layer keys
 * identity the same way.
 */
export const burstGuard: Guard = {
  key: "burst",
  label: "Per-caller burst limit",

  async check(ctx: GuardContext) {
    const { windowSeconds, maxPerWindow } = RATE_LIMIT_CONFIG.burst;
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

    // Fingerprint-first composite: session OR fingerprint (ignore IP) when a fingerprint exists;
    // otherwise session OR IP. Never IP alone — CGNAT/shared-WiFi users would punish each other.
    const keyMatches = [
      eq(usageEvents.anonymousId, ctx.anonymousId),
      ctx.fingerprint
        ? eq(usageEvents.fingerprint, ctx.fingerprint)
        : ctx.ip
          ? eq(usageEvents.ip, ctx.ip)
          : undefined,
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
