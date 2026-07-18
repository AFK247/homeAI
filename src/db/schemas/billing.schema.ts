import { relations } from "drizzle-orm";
import { index, integer, jsonb, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig, relationConfig } from "@/db/helpers/base.columns";
import { users } from "./auth.schema";
import { creditKindEnum, creditReasonEnum, paymentStatusEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

/*
 * Credit system (docs/CREDIT_SYSTEM.md §7). A cached balance per owner + an append-only ledger.
 *
 * `credit_accounts` — ONE row per owner (anon OR user), holding the cached free/paid balances.
 * `credit_transactions` — every balance change as an immutable row (grant, debit, refund,
 * expire), so the balance is always auditable ("why is my balance N?"). The two are kept in
 * sync inside a single DB transaction by CreditService.
 */

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    id,
    // Exactly one of userId / anonymousId is set (like designs). On claim-at-signup the anon
    // account's owner flips to the user (subject to the SET-to-signup-grant rule, §5).
    userId: text("user_id")
      .references(() => users.id, cascade)
      .unique(),
    anonymousId: text("anonymous_id").unique(),
    // Cached balances (fast reads). `free` credits run free-tier models only; `paid` any model.
    freeBalance: integer("free_balance").notNull().default(0),
    paidBalance: integer("paid_balance").notNull().default(0),
    ...timestampColumns,
  },
  (t) => [
    index("credit_accounts_user_idx").on(t.userId),
    index("credit_accounts_anon_idx").on(t.anonymousId),
  ],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id,
    accountId: text("account_id")
      .notNull()
      .references(() => creditAccounts.id, cascade),
    // Signed delta for THIS row's bucket. +grant / −debit / +refund / −expire.
    delta: integer("delta").notNull(),
    kind: creditKindEnum("kind").notNull(), // which bucket this row moves (free | paid)
    reason: creditReasonEnum("reason").notNull(),
    // Post-transaction snapshots of BOTH buckets — audit + O(1) history reads.
    freeAfter: integer("free_after").notNull(),
    paidAfter: integer("paid_after").notNull(),
    modelId: text("model_id"), // set on generation debits → per-model analytics
    paymentId: text("payment_id"), // set on purchase credits (FK-ish to payments)
    ...timestampColumns,
  },
  (t) => [index("credit_transactions_account_idx").on(t.accountId)],
);

/*
 * payments (§4) — SSLCommerz transactions (bKash/Nagad/cards). Unchanged; a successful payment
 * produces one `purchase` credit_transaction linked via paymentId.
 */
export const payments = pgTable("payments", {
  id,
  userId: text("user_id")
    .notNull()
    .references(() => users.id, cascade),
  amountBdt: numeric("amount_bdt", numericConfig).notNull(),
  creditsPurchased: integer("credits_purchased").notNull().default(0),
  provider: text("provider").notNull().default("sslcommerz"),
  tranId: text("tran_id").notNull().unique(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  raw: jsonb("raw"), // gateway payload
  ...timestampColumns,
});

export const creditAccountsRelations = relations(creditAccounts, ({ one, many }) => ({
  user: one(users, { fields: [creditAccounts.userId], references: [users.id] }),
  transactions: many(creditTransactions),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  account: one(creditAccounts, {
    fields: [creditTransactions.accountId],
    references: [creditAccounts.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));
