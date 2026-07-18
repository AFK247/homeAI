import "server-only";

import { gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { RATE_LIMIT_CONFIG } from "../config";
import { ALLOW, type Guard } from "../types";

/*
 * Guard 1 — GLOBAL COST CIRCUIT-BREAKER (the money kill-switch, most important layer).
 *
 * Counts ALL generations across ALL users since midnight; if the total hits the daily cap,
 * the free tier is disabled for everyone until tomorrow. This is the absolute ceiling on
 * the day's AI bill — even if every other defense is bypassed, spend cannot exceed this.
 */
export const dailyCapGuard: Guard = {
  key: "daily-cap",
  label: "Global daily cap (circuit breaker)",

  async check() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(usageEvents)
      .where(gte(usageEvents.createdAt, startOfDay.toISOString()));

    const usedToday = row?.n ?? 0;
    if (usedToday >= RATE_LIMIT_CONFIG.dailyGlobalCap) {
      return {
        allowed: false,
        code: "daily_cap",
        message: "We've hit today's free-design limit. Please try again tomorrow.",
      };
    }
    return ALLOW;
  },
};
