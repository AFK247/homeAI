import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { designs } from "@/db/schemas/design.schema";
import { events } from "@/db/schemas/event.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { vendors } from "@/db/schemas/vendor.schema";

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

  /** All vendors. */
  allVendors: async () => {
    return db.select().from(vendors).orderBy(desc(vendors.createdAt));
  },
};
