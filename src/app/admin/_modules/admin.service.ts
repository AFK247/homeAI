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
import { designs } from "@/db/schemas/design.schema";
import { events } from "@/db/schemas/event.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { vendors } from "@/db/schemas/vendor.schema";
import type { PromiseResult } from "@/lib/types/utils";

/*
 * Admin service — read-only aggregate + list queries for the admin dashboard.
 * All server-side Drizzle. No auth here yet (admin is unprotected for now).
 */
export const AdminService = {
  /** Headline counts for the overview stat cards. */
  overview: async () => {
    const [[d], [f], [v], [e], [s]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(designs),
      db.select({ n: sql<number>`count(*)::int` }).from(furnitureItems),
      db.select({ n: sql<number>`count(*)::int` }).from(vendors),
      db.select({ n: sql<number>`count(*)::int` }).from(events),
      db.select({ n: sql<number>`count(distinct ${designs.anonymousId})::int` }).from(designs),
    ]);
    return {
      designs: d?.n ?? 0,
      furniture: f?.n ?? 0,
      vendors: v?.n ?? 0,
      events: e?.n ?? 0,
      sessions: s?.n ?? 0,
    };
  },

  /** Event counts by type — the vendor sales-pitch metrics. */
  eventBreakdown: async () => {
    return db
      .select({ eventType: events.eventType, count: sql<number>`count(*)::int` })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(desc(sql`count(*)`));
  },

  /** All designs (uploads + generations), newest first. */
  allDesigns: async () => {
    return db.select().from(designs).orderBy(desc(designs.createdAt));
  },

  /** Paginated designs with backend search / filter / sort. */
  paginatedDesigns: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([designs.style, designs.roomType, designs.anonymousId], params.search),
      ...equalFilters(
        { status: designs.status, roomType: designs.roomType, style: designs.style },
        params.filters,
      ),
    ]);
    const sortMap = {
      createdAt: designs.createdAt,
      style: designs.style,
      roomType: designs.roomType,
      status: designs.status,
    };
    return paginate(params, db.select(sqlCount()).from(designs).where(where), (limit, offset) =>
      db
        .select()
        .from(designs)
        .where(where)
        .orderBy(withSorting(sortMap, params, designs.createdAt))
        .limit(limit)
        .offset(offset),
    );
  },

  /** A few most-recent designs for the overview. */
  recentDesigns: async (limit = 6) => {
    return db.select().from(designs).orderBy(desc(designs.createdAt)).limit(limit);
  },

  /** Anonymous sessions grouped: designs per session, last activity. */
  sessions: async () => {
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

  /** Recent event log with metadata. */
  recentEvents: async (limit = 50) => {
    return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
  },

  /** Paginated event log (filter by type). */
  paginatedEvents: async (params: SearchParams) => {
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

  /** Paginated vendors (filter by type). */
  paginatedVendors: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([vendors.name, vendors.type], params.search),
      ...equalFilters({ type: vendors.type }, params.filters),
    ]);
    return paginate(params, db.select(sqlCount()).from(vendors).where(where), (limit, offset) =>
      db
        .select()
        .from(vendors)
        .where(where)
        .orderBy(
          withSorting(
            { name: vendors.name, createdAt: vendors.createdAt },
            params,
            vendors.createdAt,
          ),
        )
        .limit(limit)
        .offset(offset),
    );
  },

  /** All vendors. */
  allVendors: async () => {
    return db.select().from(vendors).orderBy(desc(vendors.createdAt));
  },
};

// Inferred row types for the admin table components.
export type SessionRow = PromiseResult<typeof AdminService.sessions>[number];
export type EventRow = PromiseResult<typeof AdminService.recentEvents>[number];
export type DesignRow = PromiseResult<typeof AdminService.paginatedDesigns>["data"][number];
