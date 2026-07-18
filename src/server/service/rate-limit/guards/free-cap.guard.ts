import "server-only";

import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { RATE_LIMIT_CONFIG } from "../config";
import { ALLOW, type Guard, type GuardContext } from "../types";

/*
 * Guard 3 — FREE-GENERATION CAP.
 *
 * An anonymous session gets a lifetime of N free generations before we ask them to sign in
 * / buy credits. Counted over the COMPOSITE key (session OR ip OR fingerprint) so clearing
 * cookies doesn't reset the count. Only "generate" counts toward the cap (regenerating an
 * existing design is part of the same free design). Logged-in users bypass this guard —
 * their quota is governed by the credits system instead.
 */
export const freeCapGuard: Guard = {
  key: "free-cap",
  label: "Free-generation cap",

  async check(ctx: GuardContext) {
    // Logged-in users are handled by credits, not the anonymous free cap.
    if (ctx.userId) return ALLOW;
    // Regenerate is part of an already-counted free design — don't double-charge it.
    if (ctx.action !== "generate") return ALLOW;

    const keyMatches = [
      eq(usageEvents.anonymousId, ctx.anonymousId),
      ctx.ip ? eq(usageEvents.ip, ctx.ip) : undefined,
      ctx.fingerprint ? eq(usageEvents.fingerprint, ctx.fingerprint) : undefined,
    ].filter(Boolean);

    // Lifetime "generate" events for this composite identity.
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(usageEvents)
      .where(and(eq(usageEvents.action, "generate"), or(...keyMatches)));

    const used = row?.n ?? 0;
    if (used >= RATE_LIMIT_CONFIG.freeGenerationLimit) {
      return {
        allowed: false,
        code: "free_limit",
        message: `You've used all ${RATE_LIMIT_CONFIG.freeGenerationLimit} free designs. Sign in to get more.`,
      };
    }
    return ALLOW;
  },
};
