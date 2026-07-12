import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, relationConfig } from "@/db/helpers/base.columns";
import { users } from "./auth.schema";
import { eventTypeEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;
const { setNull } = relationConfig;

/*
 * events (plan §3.2 / PROJECT_CONTEXT §10) — THE VENDOR SALES PITCH.
 * Every generation, tag click, buy click, share, save. Instrumented from day one.
 * userId nullable (anonymous-first); anonymousId tracks pre-signup sessions.
 * Indexed on eventType + createdAt for the metrics we sell to vendors.
 */
export const events = pgTable(
  "events",
  {
    id,
    userId: text("user_id").references(() => users.id, setNull),
    anonymousId: text("anonymous_id"),
    eventType: eventTypeEnum("event_type").notNull(),
    metadata: jsonb("metadata"), // { style, roomType, furnitureItemId, source, ... }
    ...timestampColumns,
  },
  (t) => [
    index("events_type_idx").on(t.eventType),
    index("events_created_idx").on(t.createdAt),
    index("events_user_idx").on(t.userId),
  ],
);
