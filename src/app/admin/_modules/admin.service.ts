import "server-only";

import { desc, sql } from "drizzle-orm";
import { resolveDesignUrls } from "@/app/admin/designs/_modules/design.service";
import { db } from "@/db/client";
import { designs } from "@/db/schemas/design.schema";
import { events } from "@/db/schemas/event.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { vendors } from "@/db/schemas/vendor.schema";

/*
 * Admin OVERVIEW service — cross-entity reads for the dashboard only.
 *
 * Scope rule: anything about ONE entity belongs to that route's own _modules/
 * (e.g. admin/designs/_modules/design.service.ts). This file is strictly for
 * queries that span entities and have no single owner — the headline counts and
 * the dashboard's recent-activity strip.
 */
export const AdminService = {
  /** Headline counts for the overview stat cards — spans five entities. */
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

  /** A few most-recent designs for the overview strip. */
  recentDesigns: async (limit = 6) => {
    const rows = await db.select().from(designs).orderBy(desc(designs.createdAt)).limit(limit);
    return rows.map(resolveDesignUrls);
  },
};
