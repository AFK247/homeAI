import { createId } from "@paralleldrive/cuid2";
import { text, timestamp } from "drizzle-orm/pg-core";

/*
 * Shared base columns (plan §3.1), ported from the reference minus team concerns.
 * Every domain table spreads `id` + `timestampColumns` and adds a `userId` FK
 * (the tenancy boundary, replacing the reference's `teamId`).
 */
export const baseColumns = {
  id: text()
    .$default(() => createId())
    .primaryKey()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).$onUpdate(() =>
    new Date().toISOString(),
  ),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }), // soft delete
} as const;

export const relationConfig = {
  cascade: { onDelete: "cascade", onUpdate: "cascade" },
  setNull: { onDelete: "set null", onUpdate: "cascade" },
  restrict: { onDelete: "restrict", onUpdate: "cascade" },
} as const;

export const numericConfig = { mode: "number", precision: 20, scale: 2 } as const;

/** Columns the client must never set — the server injects them. Spread into validation `.omit()`. */
export const skipBaseColumns = { createdAt: true, updatedAt: true } as const;
export const skipBaseColumnsWithUserId = { ...skipBaseColumns, userId: true } as const;
