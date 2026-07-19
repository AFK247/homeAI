import "server-only";

import { desc, gte, sql } from "drizzle-orm";
import { resolveDesignUrls } from "@/app/admin/designs/_modules/design.service";
import { db } from "@/db/client";
import { designs } from "@/db/schemas/design.schema";
import { events } from "@/db/schemas/event.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { generationLogs } from "@/db/schemas/generation-log.schema";
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

  // ── overview charts ─────────────────────────────────────────────────────────

  /**
   * Daily design counts for the last `days` days — the activity trend line. Gap days are filled
   * with 0 (via a generate_series) so the line has no holes. `day` is an ISO date (yyyy-mm-dd).
   */
  designsOverTime: async (days = 14) => {
    const rows = await db.execute<{ day: string; count: number }>(sql`
      with span as (
        select generate_series(
          (current_date - make_interval(days => ${days - 1})),
          current_date,
          interval '1 day'
        )::date as day
      )
      select to_char(span.day, 'YYYY-MM-DD') as day,
             count(d.id)::int as count
      from span
      left join ${designs} d on d.created_at::date = span.day
      group by span.day
      order by span.day
    `);
    return rows.rows;
  },

  /** Design counts by style — the popular-styles donut. Ordered by count desc. */
  stylesBreakdown: async () => {
    return db
      .select({ style: designs.style, count: sql<number>`count(*)::int` })
      .from(designs)
      .groupBy(designs.style)
      .orderBy(desc(sql`count(*)`));
  },

  /** Generation attempts success vs failure — the pipeline-health ratio. */
  generationSuccess: async () => {
    const [row] = await db
      .select({
        success: sql<number>`count(*) filter (where ${generationLogs.success})::int`,
        failed: sql<number>`count(*) filter (where not ${generationLogs.success})::int`,
      })
      .from(generationLogs)
      .where(gte(generationLogs.createdAt, sql`now() - interval '30 days'`));
    return { success: row?.success ?? 0, failed: row?.failed ?? 0 };
  },
};

// Chart data row types — inferred, never hand-written.
export type DesignsOverTimeRow = Awaited<ReturnType<typeof AdminService.designsOverTime>>[number];
export type StyleBreakdownRow = Awaited<ReturnType<typeof AdminService.stylesBreakdown>>[number];
