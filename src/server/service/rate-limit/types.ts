import "server-only";

/*
 * Abuse-defense guard system (see the rate-limit design doc). Each protection layer is a
 * self-contained Guard with one job. The registry runs them in order and the FIRST denial
 * wins — so adding a new layer (Turnstile, IP intelligence, per-user credits…) is just a
 * new file added to the GUARDS array. Nothing else changes.
 *
 * This mirrors the provider-registry pattern used for AI/vision: declare capabilities as
 * data, iterate a CHAIN, never branch on the specific layer elsewhere.
 */

/** What the caller is trying to do, plus everything a guard might key off. */
export interface GuardContext {
  /** "generate" | "regenerate" — the rate-limited action. */
  action: "generate" | "regenerate";
  /** Anonymous session id, or the user id when logged in. */
  anonymousId: string;
  /** Signed-in user id, or null (logged-in users may get higher/unlimited free quota). */
  userId: string | null;
  /** Best-effort client IP (from x-forwarded-for). */
  ip: string | null;
  /** Client device fingerprint (ThumbmarkJS), when the client sends one. */
  fingerprint: string | null;
}

/** A guard's verdict. `allowed: false` blocks the request with a reason (and optional wait). */
export interface GuardResult {
  allowed: boolean;
  /** Machine code for the UI / logs, e.g. "rate_limited", "free_limit", "daily_cap". */
  code?: string;
  /** Human-friendly message shown to the user. */
  message?: string;
  /** Seconds to wait before retrying (rate limits), when applicable. */
  retryAfterSeconds?: number;
}

/** One protection layer. Keep each guard's `check` cheap and independent of the others. */
export interface Guard {
  /** Stable id for logging / config. */
  readonly key: string;
  /** Human label for the admin surface. */
  readonly label: string;
  /**
   * Decide whether to allow the action. Return `{ allowed: true }` to pass to the next
   * guard, or `{ allowed: false, ... }` to block. Should never throw — a guard that errors
   * is treated as "pass" by the registry so a bug can't take down generation entirely.
   */
  check(ctx: GuardContext): Promise<GuardResult>;
}

export const ALLOW: GuardResult = { allowed: true };
