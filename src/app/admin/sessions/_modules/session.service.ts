import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { designs } from "@/db/schemas/design.schema";

/*
 * Admin sessions service — anonymous sessions derived from designs.
 *
 * There is no sessions table: a "session" is a distinct `designs.anonymousId`, so
 * this rolls designs up by that key. Read-only; admin scope (unscoped by session,
 * unlike the anon-scoped create/_modules/design.service.ts).
 */
export const SessionService = {
  /** Anonymous sessions grouped: designs per session, last activity. */
  list: async () => {
    return db
      .select({
        anonymousId: designs.anonymousId,
        designCount: sql<number>`count(*)::int`,
        lastActive: sql<string>`max(${designs.createdAt})`,
      })
      .from(designs)
      .groupBy(designs.anonymousId)
      .orderBy(desc(sql`max(${designs.createdAt})`));
  },
};
