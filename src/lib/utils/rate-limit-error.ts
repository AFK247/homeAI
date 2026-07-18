import { ORPCError } from "@orpc/client";
import { toast } from "sonner";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Client-side handler for abuse-defense (rate-limit) denials thrown by the design router.
 * The guard chain (src/server/service/rate-limit) throws an ORPCError whose `data` carries
 * a machine `code` ("free_limit" | "rate_limited" | "daily_cap") and, for time-based
 * limits, `retryAfterSeconds`. We turn that into a clear, localized toast — and for the
 * free-cap case, a "Sign in" action that routes to login.
 *
 * Returns true if the error WAS a recognized rate-limit denial (and a toast was shown), so
 * callers can fall through to their generic handler otherwise.
 */

interface RateLimitData {
  code?: string;
  retryAfterSeconds?: number;
}

export function handleRateLimitError(
  error: unknown,
  dict: Dictionary["rateLimit"],
  onSignIn: () => void,
): boolean {
  if (!(error instanceof ORPCError)) return false;
  const data = (error.data ?? {}) as RateLimitData;
  const code = data.code;
  if (code !== "free_limit" && code !== "rate_limited" && code !== "daily_cap") return false;

  if (code === "free_limit") {
    toast.error(dict.freeLimitTitle, {
      description: dict.freeLimitBody,
      action: { label: dict.signIn, onClick: onSignIn },
    });
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
