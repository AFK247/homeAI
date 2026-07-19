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

  /*
   * Guard 3 — free-render cap: NOT configured here. The anonymous free limit is DERIVED from the
   * credit system (ANON_GRANT_CREDITS ÷ FREE_MODEL_COST in @/config/credits) inside the guard, so
   * the pre-flight cap and the authoritative credit debit can never disagree. Change the free
   * grant / render cost in the credit config, not here.
   */
} as const;
