import { relations } from "drizzle-orm";
import { integer, jsonb, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig, relationConfig } from "@/db/helpers/base.columns";
import { users } from "./auth.schema";
import { billingPlanEnum, paymentStatusEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;
const { cascade } = relationConfig;

/*
 * credits (plan §3.2) — one row per user. freeUsed drives the free-generation cap
 * (the single most important cost control, PROJECT_CONTEXT §9.1).
 */
export const credits = pgTable("credits", {
  id,
  userId: text("user_id")
    .notNull()
    .references(() => users.id, cascade)
    .unique(),
  freeUsed: integer("free_used").notNull().default(0),
  paidCredits: integer("paid_credits").notNull().default(0),
  plan: billingPlanEnum("plan").notNull().default("free"),
  ...timestampColumns,
});

/*
 * payments (plan §3.2) — SSLCommerz transactions (bKash/Nagad/cards).
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

export const creditsRelations = relations(credits, ({ one }) => ({
  user: one(users, { fields: [credits.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));
