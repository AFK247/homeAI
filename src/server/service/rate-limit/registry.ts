import "server-only";

import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { logger } from "@/lib/logger";
import { burstGuard } from "./guards/burst.guard";
import { dailyCapGuard } from "./guards/daily-cap.guard";
import { ALLOW, type Guard, type GuardContext, type GuardResult } from "./types";

/*
 * The abuse-defense CHAIN. Ordered cheapest/most-decisive first: the global cap (protects the
 * bill) → the burst limit (stops scripts). The runner stops at the FIRST guard that denies.
 *
 * NOTE: the "free render cap" is NOT a guard — the CREDIT SYSTEM is the single source of truth for
 * free-user limits. An anonymous user gets ANON_GRANT_CREDITS free credits; every render debits the
 * model's credit cost (which can differ per model), and CreditService.reserve() throws when the
 * balance can't cover the next render. Counting renders here would wrongly assume a fixed per-render
 * cost, so it was removed — the credit balance is the real, cost-accurate limit.
 *
 * To ADD A LAYER (Turnstile, IP intelligence, …): write a new guards/<name>.guard.ts implementing
 * the Guard interface, then add it to this array. Nothing else in the app changes.
 *
 * Device fingerprint (ThumbmarkJS) is LIVE: the client computes it and sends `x-device-fingerprint`
 * (see lib/fingerprint.ts + rpc client), and the burst guard + credit anti-farming (grantAnon) key
 * on it fingerprint-first (ignore IP when present, so shared WiFi is safe).
 *
 * TODO (deferred, planned): Cloudflare Turnstile (invisible CAPTCHA) to stop scripted abuse that
 * sends NO fingerprint. Needs its OWN Turnstile site/secret keys (separate from the Workers-AI
 * CLOUDFLARE_* keys) created in the Cloudflare dashboard. Add as a new guard here.
 */
export const GUARDS: Guard[] = [dailyCapGuard, burstGuard];

/**
 * Run every guard in order; return the first denial, or ALLOW if all pass. A guard that
 * throws is logged and treated as pass, so a bug in one layer can never take down
 * generation for everyone (fail-open on internal error — the daily cap still bounds cost).
 */
export async function checkGuards(ctx: GuardContext): Promise<GuardResult> {
  for (const guard of GUARDS) {
    try {
      const result = await guard.check(ctx);
      if (!result.allowed) {
        logger.info({ guard: guard.key, code: result.code, anon: ctx.anonymousId }, "blocked");
        return result;
      }
    } catch (err) {
      logger.warn({ err, guard: guard.key }, "guard errored — passing");
    }
  }
  return ALLOW;
}

/**
 * Record a (permitted) attempt so the guards can count it next time. Called AFTER
 * checkGuards passes and the action is about to run. Never throws — a failed insert must
 * not break generation.
 */
export async function recordUsage(ctx: GuardContext): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      action: ctx.action,
      anonymousId: ctx.anonymousId,
      ip: ctx.ip,
      fingerprint: ctx.fingerprint,
    });
  } catch (err) {
    logger.warn({ err }, "usage record failed");
  }
}

/** Admin-surface status: the configured guards, for a future rate-limit admin page. */
export function guardChainStatus() {
  return GUARDS.map((g, i) => ({ order: i + 1, key: g.key, label: g.label }));
}
