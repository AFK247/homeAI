import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { SearchParams } from "@/db/helpers/search-params";
import {
  andWhere,
  equalFilters,
  paginate,
  searchFilters,
  sqlCount,
  withSorting,
} from "@/db/helpers/with-filters";
import { events } from "@/db/schemas/event.schema";
import type { EventType } from "@/db/schemas/shared.schema";

/*
 * Event logging — the vendor sales pitch (PROJECT_CONTEXT §14). Records product
 * events (generation, tag_click, buy_click, share, save) into the events table.
 *
 * Owns all Drizzle for `events`: the fire-and-forget write from routers (analytics
 * must never block the user flow) and the admin read queries.
 */
export const EventService = {
  log: async (input: {
    eventType: EventType;
    anonymousId: string | null;
    userId?: string | null;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await db.insert(events).values({
        eventType: input.eventType,
        anonymousId: input.anonymousId,
        userId: input.userId ?? null,
        metadata: input.metadata ?? null,
      });
    } catch {
      // Analytics must never break the user flow.
    }
  },

  /** Paginated event log with backend search / filter (admin table). */
  listPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([events.eventType, events.anonymousId], params.search),
      ...equalFilters({ eventType: events.eventType }, params.filters),
    ]);
    return paginate(params, db.select(sqlCount()).from(events).where(where), (limit, offset) =>
      db
        .select()
        .from(events)
        .where(where)
        .orderBy(withSorting({ createdAt: events.createdAt }, params, events.createdAt))
        .limit(limit)
        .offset(offset),
    );
  },

  /** Event counts by type — the vendor sales-pitch metrics. */
  countsByType: async () => {
    return db
      .select({ eventType: events.eventType, count: sql<number>`count(*)::int` })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(desc(sql`count(*)`));
  },
};
