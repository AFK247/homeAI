import "server-only";

import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { getOpenTopupCharge, getPackChargeById } from "@/config/credits";
import { db } from "@/db/client";
import { users } from "@/db/schemas/auth.schema";
import { payments } from "@/db/schemas/billing.schema";
import { logger } from "@/lib/logger";
import { initSession, validatePayment } from "@/lib/payments/sslcommerz";
import { CreditService } from "@/server/service/credit/credit.service";

/*
 * PaymentService (docs/CREDIT_SYSTEM.md §4). Owns the SSLCommerz purchase lifecycle:
 *
 *   create()  → resolve the pack → insert a `pending` payments row (our tran_id) → open a
 *               SSLCommerz checkout session → return the gateway URL for the browser to visit.
 *   confirm() → called from BOTH the success callback AND the server IPN. Validates the payment
 *               server-to-server, checks the amount matches what we recorded, then (in ONE
 *               transaction) marks the row `success` and grants the credits. Idempotent: an
 *               already-`success` row is a no-op, so success+IPN firing together never
 *               double-grants.
 *
 * No auth/cookies/http here — the router resolves the userId and passes it in.
 */

/** Where SSLCommerz redirects the browser / posts the IPN. Built from the app base URL. */
function callbackUrls(baseUrl: string) {
  const root = baseUrl.replace(/\/$/, "");
  return {
    success: `${root}/api/payments/sslcommerz/success`,
    fail: `${root}/api/payments/sslcommerz/fail`,
    cancel: `${root}/api/payments/sslcommerz/cancel`,
    ipn: `${root}/api/payments/sslcommerz/ipn`,
  };
}

/** A resolved charge (credits + taka amount), computed server-side from a pack or a top-up. */
type Charge = { credits: number; amountBdt: number };

/**
 * Shared checkout: record a pending payment and open a SSLCommerz session. `charge` is ALWAYS
 * computed server-side (from a pack id or a bounds-checked top-up), never taken from the client.
 */
async function startCheckout(userId: string, charge: Charge, baseUrl: string) {
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("user not found");

  const tranId = `hai_${createId()}`;
  await db.insert(payments).values({
    userId,
    tranId,
    amountBdt: charge.amountBdt,
    creditsPurchased: charge.credits,
    provider: "sslcommerz",
    status: "pending",
  });

  const { gatewayUrl } = await initSession({
    tranId,
    amountBdt: charge.amountBdt,
    credits: charge.credits,
    customer: { name: user.name, email: user.email },
    urls: callbackUrls(baseUrl),
  });
  return { gatewayUrl, tranId };
}

export const PaymentService = {
  /**
   * Start a fixed-pack purchase. Resolves the pack id SERVER-SIDE (never trust the client's
   * price/credits), then hands off to the shared checkout. `baseUrl` is the app's public origin.
   */
  create: async (userId: string, packId: string, baseUrl: string) => {
    const charge = getPackChargeById(packId);
    if (!charge) throw new Error(`unknown pack: ${packId}`);
    return startCheckout(userId, charge, baseUrl);
  },

  /**
   * Start an OPEN top-up purchase (arbitrary amount). The server recomputes credits + enforces the
   * min/max bounds via getOpenTopupCharge — the client's amount is the only trusted input, and even
   * that is bounds-checked. Throws if out of range.
   */
  createOpenTopup: async (
    userId: string,
    input: { amount: number; currency: "usd" | "bdt" },
    baseUrl: string,
  ) => {
    const charge = getOpenTopupCharge(input);
    if (!charge) throw new Error("top-up amount out of range");
    return startCheckout(userId, charge, baseUrl);
  },

  /**
   * Confirm + fulfil a payment (idempotent). Given the SSLCommerz `val_id` and the `tran_id` it
   * echoed back:
   *   1. Load our pending row by tran_id (unknown/foreign tran_id → reject).
   *   2. Already `success` → no-op (idempotent; success + IPN both call this).
   *   3. Validate server-to-server; confirm the settled amount matches what we recorded.
   *   4. In ONE transaction: mark `success` + grant the credits (linked via paymentId).
   * Returns { granted: boolean } so callers can log/redirect accordingly. Never throws on a
   * "not paid" outcome — it just doesn't grant.
   */
  confirm: async (
    valId: string,
    tranId: string,
  ): Promise<{ granted: boolean; reason?: string }> => {
    const [row] = await db.select().from(payments).where(eq(payments.tranId, tranId)).limit(1);
    if (!row) {
      logger.warn({ tranId }, "SSLCommerz confirm: unknown tran_id");
      return { granted: false, reason: "unknown_tran" };
    }
    if (row.status === "success") return { granted: false, reason: "already_processed" };

    const result = await validatePayment(valId);
    if (!result.valid) {
      await db
        .update(payments)
        .set({ status: "failed", raw: result })
        .where(eq(payments.id, row.id));
      return { granted: false, reason: `invalid:${result.status}` };
    }
    // Amount tamper check — the validated amount must cover what we billed.
    const owed = row.amountBdt;
    if (result.amountBdt !== null && result.amountBdt + 0.01 < owed) {
      logger.error(
        { tranId, owed, paid: result.amountBdt },
        "SSLCommerz confirm: amount mismatch — refusing grant",
      );
      await db
        .update(payments)
        .set({ status: "failed", raw: result })
        .where(eq(payments.id, row.id));
      return { granted: false, reason: "amount_mismatch" };
    }

    // Fulfil: mark success + grant credits atomically. Re-check status inside the tx to close the
    // success/IPN race (whichever commits first wins; the loser sees `success` and no-ops).
    return db.transaction(async (tx) => {
      const [locked] = await tx
        .select({ status: payments.status })
        .from(payments)
        .where(eq(payments.id, row.id))
        .limit(1);
      if (locked?.status === "success") return { granted: false, reason: "already_processed" };

      await tx
        .update(payments)
        .set({ status: "success", raw: result })
        .where(eq(payments.id, row.id));
      await CreditService.grantPurchase(row.userId, row.creditsPurchased, row.id);
      logger.info(
        { tranId, userId: row.userId, credits: row.creditsPurchased },
        "SSLCommerz payment fulfilled",
      );
      return { granted: true };
    });
  },

  /** Mark a payment failed/cancelled from the fail/cancel callback (best-effort, no grant). */
  markFailed: async (tranId: string, status: "failed" | "cancelled") => {
    await db.update(payments).set({ status }).where(eq(payments.tranId, tranId));
  },

  /**
   * One payment by tran_id, SCOPED to the owner (a user can only ever read their own payment).
   * Used by the result page to show what was purchased. Returns null on miss / wrong owner.
   */
  getByTranId: async (userId: string, tranId: string) => {
    const [row] = await db
      .select({
        status: payments.status,
        amountBdt: payments.amountBdt,
        creditsPurchased: payments.creditsPurchased,
      })
      .from(payments)
      .where(and(eq(payments.tranId, tranId), eq(payments.userId, userId)))
      .limit(1);
    return row ?? null;
  },
};

export type PaymentInit = Awaited<ReturnType<typeof PaymentService.create>>;
export type PaymentSummary = Awaited<ReturnType<typeof PaymentService.getByTranId>>;
