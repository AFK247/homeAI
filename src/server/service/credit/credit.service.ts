import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  ANON_GRANT_CREDITS,
  RESET_BALANCE_ON_PURCHASE,
  SIGNUP_GRANT_CREDITS,
} from "@/config/credits";
import { db } from "@/db/client";
import { creditAccounts, creditTransactions } from "@/db/schemas/billing.schema";
import type { CreditKind, CreditReason } from "@/db/schemas/shared.schema";
import { type ModelId, modelCost, modelTier } from "./models";

/*
 * CreditService (docs/CREDIT_SYSTEM.md §8). All credit reads/writes live here. Every balance
 * change writes a `credit_transactions` ledger row AND updates the cached balances on
 * `credit_accounts` — in ONE DB transaction, so cache and ledger can never drift.
 *
 * Two buckets: `free` credits (grants) run free-tier models only; `paid` credits (purchases)
 * run any model (§5). The reserve/refund pair enforces the security gate (§5b): credits are
 * debited BEFORE the AI call, and refunded to the same bucket if that call fails.
 *
 * No auth/cookies/http here — callers pass the resolved owner (userId or anonymousId).
 */

/** An account is owned by exactly one of these (mirrors designs' anon-first scoping). */
export type Owner = { userId: string } | { anonymousId: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbLike = typeof db | Tx;

function ownerWhere(owner: Owner) {
  return "userId" in owner
    ? eq(creditAccounts.userId, owner.userId)
    : eq(creditAccounts.anonymousId, owner.anonymousId);
}

/** Fetch the owner's account row (or null). */
async function findAccount(exec: DbLike, owner: Owner) {
  const [row] = await exec.select().from(creditAccounts).where(ownerWhere(owner)).limit(1);
  return row ?? null;
}

/** Get-or-create the account row for an owner. */
async function ensureAccount(exec: DbLike, owner: Owner) {
  const existing = await findAccount(exec, owner);
  if (existing) return existing;
  const [created] = await exec
    .insert(creditAccounts)
    .values({
      userId: "userId" in owner ? owner.userId : null,
      anonymousId: "anonymousId" in owner ? owner.anonymousId : null,
    })
    .returning();
  // If a concurrent insert won the unique race, fall back to the existing row.
  return created ?? (await findAccount(exec, owner));
}

/** Append one ledger row and update the cached balances, given the new totals. */
async function writeLedger(
  exec: DbLike,
  accountId: string,
  opts: {
    delta: number;
    kind: CreditKind;
    reason: CreditReason;
    freeAfter: number;
    paidAfter: number;
    modelId?: string | null;
    paymentId?: string | null;
  },
) {
  await exec
    .update(creditAccounts)
    .set({ freeBalance: opts.freeAfter, paidBalance: opts.paidAfter })
    .where(eq(creditAccounts.id, accountId));
  const [txn] = await exec
    .insert(creditTransactions)
    .values({
      accountId,
      delta: opts.delta,
      kind: opts.kind,
      reason: opts.reason,
      freeAfter: opts.freeAfter,
      paidAfter: opts.paidAfter,
      modelId: opts.modelId ?? null,
      paymentId: opts.paymentId ?? null,
    })
    .returning();
  return txn;
}

export class InsufficientCreditsError extends Error {
  constructor(readonly needed: number) {
    super("insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

export const CreditService = {
  /** Cached balances for an owner. Missing account → zeros (no side effects). */
  getBalance: async (owner: Owner): Promise<{ free: number; paid: number; total: number }> => {
    const acc = await findAccount(db, owner);
    const free = acc?.freeBalance ?? 0;
    const paid = acc?.paidBalance ?? 0;
    return { free, paid, total: free + paid };
  },

  /**
   * First-visit anonymous grant of `free` credits — ONCE per composite identity (§5). Two guards:
   *   1. Per anonymousId — already has an account → no-op (idempotent).
   *   2. Anti-farming — if a PRIOR anon account shares this IP OR fingerprint, we still create the
   *      account (so the session works) but grant it ZERO credits. This stops "clear cookies →
   *      fresh 10 credits": a new anonymousId doesn't escape a device/network that already claimed
   *      its free grant. IP/fingerprint are captured on the FIRST grant for the match.
   *
   * `signals` come from the request (rate-limit context). Null signals simply don't match — a
   * client that sends neither IP nor fingerprint is only protected by the cookie (best-effort).
   */
  grantAnon: async (
    anonymousId: string,
    signals?: { ip?: string | null; fingerprint?: string | null },
  ) => {
    const ip = signals?.ip ?? null;
    const fingerprint = signals?.fingerprint ?? null;
    return db.transaction(async (tx) => {
      const existing = await findAccount(tx, { anonymousId });
      if (existing) return existing; // already granted for this session

      /*
       * Anti-farming, tuned for shared WiFi (common in BD — households, offices, carrier CGNAT
       * share one IP across many real users). The DEVICE FINGERPRINT is the strong signal; IP is
       * only a weak fallback:
       *   - fingerprint present → block iff the SAME fingerprint already got a grant. Different
       *     real users on one WiFi have different fingerprints, so they're NOT blocked; a farmer
       *     clearing cookies on the same device IS blocked.
       *   - fingerprint absent → we can't tell devices apart, so fall back to blocking on IP.
       * We deliberately do NOT block on IP when a fingerprint is present.
       */
      const matchClause = fingerprint
        ? eq(creditAccounts.grantFingerprint, fingerprint)
        : ip
          ? eq(creditAccounts.grantIp, ip)
          : undefined;
      let alreadyGranted = false;
      if (matchClause) {
        const [prior] = await tx
          .select({ id: creditAccounts.id })
          .from(creditAccounts)
          .where(matchClause)
          .limit(1);
        alreadyGranted = Boolean(prior);
      }

      const grant = alreadyGranted ? 0 : ANON_GRANT_CREDITS;
      const [acc] = await tx
        .insert(creditAccounts)
        .values({
          anonymousId,
          freeBalance: grant,
          grantIp: ip,
          grantFingerprint: fingerprint,
        })
        .returning();
      if (!acc) throw new Error("failed to create anon account");
      // Only write a ledger row when credits are actually granted.
      if (grant > 0) {
        await writeLedger(tx, acc.id, {
          delta: grant,
          kind: "free",
          reason: "anon_grant",
          freeAfter: grant,
          paidAfter: 0,
        });
      }
      return acc;
    });
  },

  /**
   * Signup opening grant (§5): SET the user's free balance to SIGNUP_GRANT_CREDITS, ONCE per
   * account. Replaces any leftover (a compensating `expire` row zeroes prior balances first, so
   * the ledger stays consistent). Called from the claim-on-signup hook.
   */
  grantSignup: async (userId: string) => {
    return db.transaction(async (tx) => {
      const acc = await ensureAccount(tx, { userId });
      if (!acc) throw new Error("failed to resolve account");
      // Once-per-account: if a signup grant already exists, do nothing.
      const [prior] = await tx
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.accountId, acc.id),
            eq(creditTransactions.reason, "signup_grant"),
          ),
        )
        .limit(1);
      if (prior) return acc;

      // Wipe leftover (both buckets) as an audit row, then set free = signup grant.
      if (acc.freeBalance > 0 || acc.paidBalance > 0) {
        await writeLedger(tx, acc.id, {
          delta: -(acc.freeBalance + acc.paidBalance),
          kind: "free",
          reason: "expire",
          freeAfter: 0,
          paidAfter: 0,
        });
      }
      await writeLedger(tx, acc.id, {
        delta: SIGNUP_GRANT_CREDITS,
        kind: "free",
        reason: "signup_grant",
        freeAfter: SIGNUP_GRANT_CREDITS,
        paidAfter: 0,
      });
      return { ...acc, freeBalance: SIGNUP_GRANT_CREDITS, paidBalance: 0 };
    });
  },

  /**
   * Credit a purchase (§4). With RESET_BALANCE_ON_PURCHASE (default true), SETS the paid balance
   * to `credits` and wipes any leftover (logged as `expire`); otherwise adds. `paid` kind.
   */
  grantPurchase: async (userId: string, credits: number, paymentId?: string) => {
    return db.transaction(async (tx) => {
      const acc = await ensureAccount(tx, { userId });
      if (!acc) throw new Error("failed to resolve account");
      if (RESET_BALANCE_ON_PURCHASE && (acc.freeBalance > 0 || acc.paidBalance > 0)) {
        await writeLedger(tx, acc.id, {
          delta: -(acc.freeBalance + acc.paidBalance),
          kind: "paid",
          reason: "expire",
          freeAfter: 0,
          paidAfter: 0,
        });
      }
      const paidAfter = RESET_BALANCE_ON_PURCHASE ? credits : acc.paidBalance + credits;
      const freeAfter = RESET_BALANCE_ON_PURCHASE ? 0 : acc.freeBalance;
      return writeLedger(tx, acc.id, {
        delta: credits,
        kind: "paid",
        reason: "purchase",
        freeAfter,
        paidAfter,
        paymentId,
      });
    });
  },

  /**
   * Reserve credits for a generation BEFORE the AI call (§5b). Looks up the model's cost + tier,
   * debits the correct bucket (free-tier → free credits, falling back to paid; paid-tier → paid
   * ONLY), inside a transaction. Throws InsufficientCreditsError if the required bucket can't
   * cover it (caller maps to PAYMENT_REQUIRED and does NOT call the AI). Returns the debit txn id
   * for a later refund.
   */
  reserve: async (owner: Owner, model: ModelId | string) => {
    const cost = modelCost(model);
    const tier = modelTier(model);
    return db.transaction(async (tx) => {
      const acc = await ensureAccount(tx, owner);
      if (!acc) throw new Error("failed to resolve account");

      let fromFree = 0;
      let fromPaid = 0;
      if (tier === "free") {
        // free credits first, then paid
        fromFree = Math.min(acc.freeBalance, cost);
        fromPaid = cost - fromFree;
      } else {
        // premium/flagship: paid credits ONLY
        fromPaid = cost;
      }
      if (fromPaid > acc.paidBalance || fromFree > acc.freeBalance) {
        throw new InsufficientCreditsError(cost);
      }

      const freeAfter = acc.freeBalance - fromFree;
      const paidAfter = acc.paidBalance - fromPaid;
      const txn = await writeLedger(tx, acc.id, {
        delta: -cost,
        // Record the bucket that carried the majority of the debit for the row's `kind`.
        kind: fromPaid >= fromFree ? "paid" : "free",
        reason: "generation",
        freeAfter,
        paidAfter,
        modelId: model,
      });
      return { txnId: txn?.id ?? null, accountId: acc.id, cost, fromFree, fromPaid };
    });
  },

  /**
   * Refund a previously-reserved generation (§5b step 4) when the AI call fails — credits go
   * back to the SAME buckets they came from. Idempotent-ish: caller passes the reserve result.
   */
  refund: async (accountId: string, fromFree: number, fromPaid: number, model?: string) => {
    if (fromFree === 0 && fromPaid === 0) return null;
    return db.transaction(async (tx) => {
      const [acc] = await tx
        .select()
        .from(creditAccounts)
        .where(eq(creditAccounts.id, accountId))
        .limit(1);
      if (!acc) return null;
      const freeAfter = acc.freeBalance + fromFree;
      const paidAfter = acc.paidBalance + fromPaid;
      return writeLedger(tx, acc.id, {
        delta: fromFree + fromPaid,
        kind: fromPaid >= fromFree ? "paid" : "free",
        reason: "refund",
        freeAfter,
        paidAfter,
        modelId: model ?? null,
      });
    });
  },

  /** Recent ledger rows for an owner (audit / "my history"). */
  history: async (owner: Owner, limit = 50) => {
    const acc = await findAccount(db, owner);
    if (!acc) return [];
    return db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.accountId, acc.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  },

  /**
   * Migrate an anonymous account's ownership to a user at claim-on-signup, when the user has no
   * account yet. Because signup SETS the balance to the opening grant anyway (grantSignup),
   * this is mostly a bookkeeping link; kept separate so the claim hook can call it explicitly.
   */
  attachAnonToUser: async (anonymousId: string, userId: string) => {
    return db.transaction(async (tx) => {
      const userAcc = await findAccount(tx, { userId });
      if (userAcc) return userAcc; // user already has an account; anon stays orphaned
      const anonAcc = await findAccount(tx, { anonymousId });
      if (!anonAcc) return null;
      const [updated] = await tx
        .update(creditAccounts)
        .set({ userId, anonymousId: null })
        .where(eq(creditAccounts.id, anonAcc.id))
        .returning();
      return updated ?? null;
    });
  },
};

// Types inferred from the service (golden rule — never hand-write).
export type CreditBalance = Awaited<ReturnType<typeof CreditService.getBalance>>;
export type CreditReserve = Awaited<ReturnType<typeof CreditService.reserve>>;
