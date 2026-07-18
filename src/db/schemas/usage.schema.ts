import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { baseColumns } from "@/db/helpers/base.columns";

const { id } = baseColumns;

/*
 * usage_events — one row per rate-limited AI action (generate / regenerate). This is the
 * backing store for the abuse defenses (docs — see the rate-limit design):
 *
 *  1. Global cost circuit-breaker: count ALL rows since midnight → hard daily ceiling.
 *  2. Per-caller rate limit: count rows for a composite key in a short trailing window.
 *  3. Free-generation cap: count a session's lifetime generate rows vs FREE_GENERATION_LIMIT.
 *
 * DB-backed (not in-memory) so it works on any host — serverless or single server — since
 * every deployment shares the same Postgres. Kept separate from generation_logs (which is
 * the engineering/cost audit trail) so a failed/blocked attempt is still counted here.
 */
export const usageEvents = pgTable(
  "usage_events",
  {
    id,
    /** What was attempted — "generate" | "regenerate". */
    action: text("action").notNull(),
    /** Anonymous session id (or the user id when logged in). */
    anonymousId: text("anonymous_id").notNull(),
    /** Best-effort client IP (from x-forwarded-for). Part of the composite rate-limit key. */
    ip: text("ip"),
    /** Client device fingerprint (ThumbmarkJS), when provided. Survives cookie clearing. */
    fingerprint: text("fingerprint"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("usage_events_created_idx").on(t.createdAt),
    index("usage_events_anon_idx").on(t.anonymousId),
    index("usage_events_ip_idx").on(t.ip),
    index("usage_events_fp_idx").on(t.fingerprint),
  ],
);
