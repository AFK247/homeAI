/*
 * All abuse-defense knobs in ONE place, so tuning limits never means hunting through code.
 * Each guard reads its own section. Change a number here to change the policy.
 */
export const RATE_LIMIT_CONFIG = {
  /** Guard 1 — global cost circuit-breaker. The hard daily ceiling on TOTAL generations
   *  across ALL users. Bounds the worst-case bill no matter what abuse gets through. */
  dailyGlobalCap: 2000,

  /** Guard 2 — per-caller burst limit (sliding window). Keyed on a composite of
   *  anonymousId + ip + fingerprint (never ip alone — Bangladesh CGNAT shares IPs). */
  burst: {
    windowSeconds: 60,
    maxPerWindow: 8,
  },

  /** Guard 3 — free-generation cap. Lifetime free generations for an ANONYMOUS session
   *  before we ask them to sign in / buy credits. Logged-in users bypass this guard. */
  freeGenerationLimit: 5,
} as const;
