import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import type { SearchParams } from "@/db/helpers/search-params";
import { users } from "@/db/schemas/auth.schema";
import { creditAccounts, creditTransactions, payments } from "@/db/schemas/billing.schema";
import { designs } from "@/db/schemas/design.schema";

/*
 * Admin BILLING service — read-only reporting over the credit + payment tables. Admin scope:
 * unscoped by owner (unlike CreditService, which is always caller-scoped). Nothing here mutates;
 * it's the analytics layer for the admin dashboards. All reads use the typed Drizzle builder.
 *
 * Owner types — the set spans EVERY signed-up user plus every anonymous account, so a user is
 * never missing just because they lack a credit account:
 *   - anonymous  : a credit_accounts row with no user (a currently-anonymous session)
 *   - paid       : a signed-up user whose account has ≥1 `purchase`
 *   - free       : a signed-up user with an account but no purchase
 *   - registered : a signed-up user with NO credit account yet (never granted/bought)
 *
 * To avoid per-row subqueries, the ledger and payments are pre-aggregated into small grouped
 * subqueries (perAccount / perUser) that the main queries leftJoin against.
 */

// ── Reusable aggregate subqueries (typed) ────────────────────────────────────

/** Per-account ledger rollup: credits consumed, purchased, whether it ever purchased, last activity. */
function perAccountAgg() {
  return db
    .select({
      accountId: creditTransactions.accountId,
      consumed:
        sql<number>`coalesce(-sum(${creditTransactions.delta}) filter (where ${creditTransactions.reason} = 'generation'), 0)::int`.as(
          "consumed",
        ),
      purchased:
        sql<number>`coalesce(sum(${creditTransactions.delta}) filter (where ${creditTransactions.reason} = 'purchase'), 0)::int`.as(
          "purchased",
        ),
      purchaseCount:
        sql<number>`count(*) filter (where ${creditTransactions.reason} = 'purchase')::int`.as(
          "purchase_count",
        ),
      lastTxnAt: sql<string | null>`max(${creditTransactions.createdAt})`.as("last_txn_at"),
    })
    .from(creditTransactions)
    .groupBy(creditTransactions.accountId)
    .as("per_account");
}

/** Per-user payment rollup: total BDT successfully paid. */
function perUserPaymentAgg() {
  return db
    .select({
      userId: payments.userId,
      spentBdt:
        sql<number>`coalesce(sum(${payments.amountBdt}) filter (where ${payments.status} = 'success'), 0)::float8`.as(
          "spent_bdt",
        ),
    })
    .from(payments)
    .groupBy(payments.userId)
    .as("per_user_payment");
}

/** Designs count per signed-up user (designs owned by userId). */
function designsByUserAgg() {
  return db
    .select({
      userId: designs.userId,
      designCount: sql<number>`count(*)::int`.as("design_count"),
    })
    .from(designs)
    .groupBy(designs.userId)
    .as("designs_by_user");
}

/** Designs count per anonymous session (designs owned by anonymousId). */
function designsByAnonAgg() {
  return db
    .select({
      anonymousId: designs.anonymousId,
      designCount: sql<number>`count(*)::int`.as("design_count"),
    })
    .from(designs)
    .groupBy(designs.anonymousId)
    .as("designs_by_anon");
}

export const AdminBillingService = {
  /**
   * Per-owner usage table, paginated. Two typed selects unioned: every signed-up user (users
   * LEFT JOIN their account + rollups → account-less users still appear) and every anonymous
   * account. Filterable by ?type=paid|free|registered|anonymous.
   */
  usersUsage: async (params: SearchParams) => {
    const acc = perAccountAgg();
    const pay = perUserPaymentAgg();
    const dpu = designsByUserAgg();
    const dpa = designsByAnonAgg();

    // Owner type as a typed SQL case, shared by both halves of the union.
    const userType = sql<OwnerType>`case
      when ${creditAccounts.id} is null then 'registered'
      when coalesce(${acc.purchaseCount}, 0) > 0 then 'paid'
      else 'free' end`;

    const usersHalf = db
      .select({
        accountId: creditAccounts.id,
        userId: sql<string | null>`${users.id}`.as("user_id"),
        anonymousId: sql<string | null>`null`.as("anonymous_id"),
        name: sql<string | null>`${users.name}`.as("name"),
        email: sql<string | null>`${users.email}`.as("email"),
        freeBalance: sql<number>`coalesce(${creditAccounts.freeBalance}, 0)`.as("free_balance"),
        paidBalance: sql<number>`coalesce(${creditAccounts.paidBalance}, 0)`.as("paid_balance"),
        consumed: sql<number>`coalesce(${acc.consumed}, 0)`.as("consumed"),
        spentBdt: sql<number>`coalesce(${pay.spentBdt}, 0)`.as("spent_bdt"),
        designCount: sql<number>`coalesce(${dpu.designCount}, 0)`.as("design_count"),
        type: userType.as("type"),
        lastActive: sql<string>`coalesce(${acc.lastTxnAt}, ${users.createdAt})`.as("last_active"),
      })
      .from(users)
      .leftJoin(creditAccounts, eq(creditAccounts.userId, users.id))
      .leftJoin(acc, eq(acc.accountId, creditAccounts.id))
      .leftJoin(pay, eq(pay.userId, users.id))
      .leftJoin(dpu, eq(dpu.userId, users.id));

    const anonHalf = db
      .select({
        accountId: creditAccounts.id,
        userId: sql<string | null>`null`.as("user_id"),
        anonymousId: creditAccounts.anonymousId,
        name: sql<string | null>`null`.as("name"),
        email: sql<string | null>`null`.as("email"),
        freeBalance: creditAccounts.freeBalance,
        paidBalance: creditAccounts.paidBalance,
        consumed: sql<number>`coalesce(${acc.consumed}, 0)`.as("consumed"),
        spentBdt: sql<number>`0`.as("spent_bdt"),
        designCount: sql<number>`coalesce(${dpa.designCount}, 0)`.as("design_count"),
        type: sql<OwnerType>`'anonymous'`.as("type"),
        lastActive: sql<string>`coalesce(${acc.lastTxnAt}, ${creditAccounts.createdAt})`.as(
          "last_active",
        ),
      })
      .from(creditAccounts)
      .leftJoin(acc, eq(acc.accountId, creditAccounts.id))
      .leftJoin(dpa, eq(dpa.anonymousId, creditAccounts.anonymousId))
      .where(isNull(creditAccounts.userId));

    // Union both halves into a subquery we can filter/sort/paginate as one set.
    const owners = unionAll(usersHalf, anonHalf).as("owners");

    const typeFilter = params.filters?.type;
    const where =
      typeFilter === "paid" ||
      typeFilter === "free" ||
      typeFilter === "registered" ||
      typeFilter === "anonymous"
        ? eq(owners.type, typeFilter)
        : undefined;

    const [countRow] = await db.select({ n: sql<number>`count(*)::int` }).from(owners).where(where);
    const total = countRow?.n ?? 0;

    const data = await db
      .select()
      .from(owners)
      .where(where)
      .orderBy(desc(owners.consumed), desc(owners.lastActive))
      .limit(params.size)
      .offset((params.page - 1) * params.size);

    return {
      data,
      total,
      page: params.page,
      size: params.size,
      pageCount: Math.ceil(total / params.size),
    };
  },

  /**
   * Cohort summary — counts + credits consumed per segment, over the SAME owner set as the table
   * (so overview and table agree). Registered users (no account) fold into Free.
   */
  segments: async () => {
    const rows = await AdminBillingService.usersUsage({
      order: "desc",
      page: 1,
      size: 100000,
    }).then((r) => r.data);

    const seg = {
      anonCount: 0,
      anonConsumed: 0,
      paidCount: 0,
      paidConsumed: 0,
      freeCount: 0,
      freeConsumed: 0,
    };
    for (const r of rows) {
      if (r.type === "anonymous") {
        seg.anonCount++;
        seg.anonConsumed += r.consumed;
      } else if (r.type === "paid") {
        seg.paidCount++;
        seg.paidConsumed += r.consumed;
      } else {
        // free + registered
        seg.freeCount++;
        seg.freeConsumed += r.consumed;
      }
    }
    return seg;
  },

  /** Headline revenue/usage numbers for the overview stat cards. */
  revenueSummary: async () => {
    const [[rev], [cr]] = await Promise.all([
      db
        .select({
          revenueBdt: sql<number>`coalesce(sum(${payments.amountBdt}) filter (where ${payments.status} = 'success'), 0)::float8`,
          payingUsers: sql<number>`count(distinct ${payments.userId}) filter (where ${payments.status} = 'success')::int`,
          creditsSold: sql<number>`coalesce(sum(${payments.creditsPurchased}) filter (where ${payments.status} = 'success'), 0)::int`,
        })
        .from(payments),
      db
        .select({
          creditsConsumed: sql<number>`coalesce(-sum(${creditTransactions.delta}) filter (where ${creditTransactions.reason} = 'generation'), 0)::int`,
        })
        .from(creditTransactions),
    ]);
    return {
      revenueBdt: rev?.revenueBdt ?? 0,
      payingUsers: rev?.payingUsers ?? 0,
      creditsSold: rev?.creditsSold ?? 0,
      creditsConsumed: cr?.creditsConsumed ?? 0,
    };
  },

  /**
   * Payments table (all SSLCommerz transactions), paginated, with the buyer's name/email joined.
   * Filterable by ?status=pending|success|failed|cancelled.
   */
  payments: async (params: SearchParams) => {
    const statusFilter = params.filters?.status;
    const where = statusFilter ? eq(payments.status, statusFilter as PaymentStatusLike) : undefined;

    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(payments)
      .where(where);
    const total = countRow?.n ?? 0;

    const data = await db
      .select({
        id: payments.id,
        tranId: payments.tranId,
        userName: users.name,
        userEmail: users.email,
        amountBdt: payments.amountBdt,
        credits: payments.creditsPurchased,
        provider: payments.provider,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(users, eq(users.id, payments.userId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(params.size)
      .offset((params.page - 1) * params.size);

    return {
      data,
      total,
      page: params.page,
      size: params.size,
      pageCount: Math.ceil(total / params.size),
    };
  },

  /**
   * Raw credit ledger feed, paginated, newest first. Joins the owning account's identity.
   * Filterable by ?kind=free|paid and ?reason=<CreditReason>.
   */
  ledger: async (params: SearchParams) => {
    const clauses = [];
    if (params.filters?.kind)
      clauses.push(eq(creditTransactions.kind, params.filters.kind as "free" | "paid"));
    if (params.filters?.reason)
      clauses.push(eq(creditTransactions.reason, params.filters.reason as ReasonLike));
    const where = clauses.length ? and(...clauses) : undefined;

    const [countRow] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(creditTransactions)
      .where(where);
    const total = countRow?.n ?? 0;

    const data = await db
      .select({
        id: creditTransactions.id,
        delta: creditTransactions.delta,
        kind: creditTransactions.kind,
        reason: creditTransactions.reason,
        freeAfter: creditTransactions.freeAfter,
        paidAfter: creditTransactions.paidAfter,
        modelId: creditTransactions.modelId,
        userEmail: users.email,
        anonymousId: creditAccounts.anonymousId,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .innerJoin(creditAccounts, eq(creditAccounts.id, creditTransactions.accountId))
      .leftJoin(users, eq(users.id, creditAccounts.userId))
      .where(where)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(params.size)
      .offset((params.page - 1) * params.size);

    return {
      data,
      total,
      page: params.page,
      size: params.size,
      pageCount: Math.ceil(total / params.size),
    };
  },
};

// ── types ─────────────────────────────────────────────────────────────────────

type PaymentStatusLike = "pending" | "success" | "failed" | "cancelled";
type ReasonLike =
  | "anon_grant"
  | "signup_grant"
  | "purchase"
  | "generation"
  | "refund"
  | "expire"
  | "admin_adjust";

export type OwnerType = "anonymous" | "free" | "paid" | "registered";

// Row types inferred from the service (golden rule — never hand-write).
export type UserUsageRow = Awaited<
  ReturnType<typeof AdminBillingService.usersUsage>
>["data"][number];
export type PaymentRow = Awaited<ReturnType<typeof AdminBillingService.payments>>["data"][number];
export type LedgerRow = Awaited<ReturnType<typeof AdminBillingService.ledger>>["data"][number];
export type BillingSegments = Awaited<ReturnType<typeof AdminBillingService.segments>>;
export type RevenueSummary = Awaited<ReturnType<typeof AdminBillingService.revenueSummary>>;
