import { ORPCError } from "@orpc/client";
import { toast } from "sonner";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Client-side handler for abuse-defense + credit denials thrown by the design router. The error is
 * an ORPCError whose `data` carries a machine `code`:
 *   - "no_credits"   — CREDIT SYSTEM (the source of truth for free/paid limits). `data.anonymous`
 *                      says whether the caller is anonymous (→ "Sign in" toast) or a logged-in user
 *                      who ran out (→ "Buy credits" toast). Replaces the old free-cap guard.
 *   - "rate_limited" — burst guard (too fast). Carries `retryAfterSeconds`.
 *   - "daily_cap"    — global daily cost breaker.
 *   - "free_limit"   — legacy free-cap code; still handled for safety (behaves like anon no_credits).
 * We turn that into a clear, localized toast with the right call-to-action.
 *
 * Returns true if the error WAS a recognized denial (and a toast was shown), so callers can fall
 * through to their generic handler otherwise. `onBuyCredits` is optional — omit it and the
 * logged-in out-of-credits case shows the message without a button.
 */

interface RateLimitData {
  code?: string;
  retryAfterSeconds?: number;
  anonymous?: boolean;
}

export function handleRateLimitError(
  error: unknown,
  dict: Dictionary["rateLimit"],
  onSignIn: () => void,
  onBuyCredits?: () => void,
): boolean {
  if (!(error instanceof ORPCError)) return false;
  const data = (error.data ?? {}) as RateLimitData;
  const code = data.code;
  if (
    code !== "no_credits" &&
    code !== "free_limit" &&
    code !== "rate_limited" &&
    code !== "daily_cap"
  ) {
    return false;
  }

  // Out of credits — the credit system's denial. Anonymous → sign in; logged-in → buy credits.
  // (The legacy "free_limit" code from the removed free-cap guard is treated as the anon case.)
  if (code === "no_credits" || code === "free_limit") {
    const anonymous = code === "free_limit" ? true : (data.anonymous ?? true);
    if (anonymous) {
      toast.error(dict.freeLimitTitle, {
        description: dict.freeLimitBody,
        action: { label: dict.signIn, onClick: onSignIn },
      });
    } else {
      toast.error(dict.outOfCreditsTitle, {
        description: dict.outOfCreditsBody,
        action: onBuyCredits ? { label: dict.buyCredits, onClick: onBuyCredits } : undefined,
      });
    }
    return true;
  }

  if (code === "rate_limited") {
    const wait = data.retryAfterSeconds;
    toast.error(dict.rateLimitedTitle, {
      description: wait
        ? dict.rateLimitedWait.replace("{seconds}", String(wait))
        : dict.rateLimitedBody,
    });
    return true;
  }

  // daily_cap
  toast.error(dict.dailyCapTitle, { description: dict.dailyCapBody });
  return true;
}
