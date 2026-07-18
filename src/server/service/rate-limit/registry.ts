import "server-only";

import { db } from "@/db/client";
import { usageEvents } from "@/db/schemas/usage.schema";
import { logger } from "@/lib/logger";
import { burstGuard } from "./guards/burst.guard";
import { dailyCapGuard } from "./guards/daily-cap.guard";
import { freeCapGuard } from "./guards/free-cap.guard";
import { ALLOW, type Guard, type GuardContext, type GuardResult } from "./types";

/*
 * The abuse-defense CHAIN. Ordered cheapest/most-decisive first: the global cap (protects
 * the bill) → the burst limit (stops scripts) → the free cap (business rule). The runner
 * stops at the FIRST guard that denies.
 *
 * To ADD A LAYER (Turnstile, IP intelligence, per-user credits, …): write a new
 * guards/<name>.guard.ts implementing the Guard interface, then add it to this array in
 * the right position. Nothing else in the app changes — the runner and callers are generic.
 *
 * TODO (deferred, planned): Layer 3 — Cloudflare Turnstile (invisible CAPTCHA) to stop
 * scripted abuse. Needs its OWN Turnstile site/secret keys (separate from the Workers-AI
 * CLOUDFLARE_* keys) created in the Cloudflare dashboard. The request context already
 * carries `fingerprint` (x-device-fingerprint header) for a future ThumbmarkJS device
 * fingerprint too. Add both as new guards here when ready.
 */
export const GUARDS: Guard[] = [dailyCapGuard, burstGuard, freeCapGuard];

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
