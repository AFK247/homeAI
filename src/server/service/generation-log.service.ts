import "server-only";

import { eq, sql } from "drizzle-orm";
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
import { generationLogs } from "@/db/schemas/generation-log.schema";
import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import { StorageService } from "@/server/service/storage/storage.service";

/*
 * Generation logging — the engineering/cost audit trail for AI redesigns.
 * One row per generation attempt (provider, model, cost, latency, success,
 * fallback chain). Separate from EventService (product/vendor analytics).
 *
 * Owns all Drizzle for `generation_logs`: the fire-and-forget write from the router
 * (logging must never break the user flow) and the admin read queries.
 */

export interface GenerationLogInput {
  designId?: string | null;
  anonymousId: string | null;
  userId?: string | null;
  roomType: RoomType;
  style: DesignStyle;
  hasUserPrompt: boolean;
  prompt?: string | null;
  success: boolean;
  provider?: string | null;
  model?: string | null;
  imageUrl?: string | null;
  providersTried?: string[];
  errorMessage?: string | null;
  costUsd?: number | null;
  latencyMs?: number | null;
  inputBytes?: number | null;
  inputWidth?: number | null;
  inputHeight?: number | null;
  outputBytes?: number | null;
  outputWidth?: number | null;
  outputHeight?: number | null;
}

export const GenerationLogService = {
  log: async (input: GenerationLogInput): Promise<void> => {
    try {
      await db.insert(generationLogs).values({
        designId: input.designId ?? null,
        anonymousId: input.anonymousId,
        userId: input.userId ?? null,
        roomType: input.roomType,
        style: input.style,
        hasUserPrompt: input.hasUserPrompt,
        prompt: input.prompt ?? null,
        success: input.success,
        provider: input.provider ?? null,
        model: input.model ?? null,
        imageUrl: input.imageUrl ?? null,
        providersTried: input.providersTried ?? null,
        errorMessage: input.errorMessage ?? null,
        costUsd: input.costUsd ?? null,
        latencyMs: input.latencyMs ?? null,
        inputBytes: input.inputBytes ?? null,
        inputWidth: input.inputWidth ?? null,
        inputHeight: input.inputHeight ?? null,
        outputBytes: input.outputBytes ?? null,
        outputWidth: input.outputWidth ?? null,
        outputHeight: input.outputHeight ?? null,
      });
    } catch {
      // Logging must never break the user flow.
    }
  },

  /** Paginated generation logs with backend search / filter / sort (admin table). */
  listPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters(
        [generationLogs.model, generationLogs.provider, generationLogs.anonymousId],
        params.search,
      ),
      ...equalFilters(
        {
          provider: generationLogs.provider,
          style: generationLogs.style,
          roomType: generationLogs.roomType,
          session: generationLogs.anonymousId,
          designId: generationLogs.designId,
        },
        params.filters,
      ),
    ]);
    const sortMap = {
      createdAt: generationLogs.createdAt,
      costUsd: generationLogs.costUsd,
      latencyMs: generationLogs.latencyMs,
      model: generationLogs.model,
    };
    return paginate(
      params,
      db.select(sqlCount()).from(generationLogs).where(where),
      (limit, offset) =>
        db
          .select()
          .from(generationLogs)
          .where(where)
          .orderBy(withSorting(sortMap, params, generationLogs.createdAt))
          .limit(limit)
          .offset(offset),
    );
  },

  /** One generation attempt by id, or null. Image key resolved to a public URL. */
  getById: async (id: string) => {
    const [row] = await db.select().from(generationLogs).where(eq(generationLogs.id, id));
    if (!row) return null;
    return { ...row, imageUrl: StorageService.publicUrl(row.imageUrl) };
  },

  /** Headline KPIs: total spend, count, success rate, avg latency. */
  stats: async () => {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        succeeded: sql<number>`count(*) filter (where ${generationLogs.success})::int`,
        totalCostUsd: sql<number>`coalesce(sum(${generationLogs.costUsd}), 0)::float`,
        avgLatencyMs: sql<number>`coalesce(round(avg(${generationLogs.latencyMs})), 0)::int`,
      })
      .from(generationLogs);
    return row ?? { total: 0, succeeded: 0, totalCostUsd: 0, avgLatencyMs: 0 };
  },

  /** Successful generation count per provider, keyed by provider. */
  countsByProvider: async (): Promise<Record<string, number>> => {
    const rows = await db
      .select({
        provider: generationLogs.provider,
        count: sql<number>`count(*) filter (where ${generationLogs.success})::int`,
      })
      .from(generationLogs)
      .groupBy(generationLogs.provider);
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (r.provider) map[r.provider] = r.count;
    }
    return map;
  },
};
