import "server-only";

import { eq } from "drizzle-orm";
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
import { StorageService } from "@/server/service/storage/storage.service";

/*
 * Admin designs service — read-only list + detail queries.
 *
 * ADMIN-SCOPED: unlike create/_modules/design.service.ts (which scopes every row by
 * anonymousId for the end user), this reads across all sessions for the admin table.
 * Keep the two separate — merging them risks leaking one session's designs to
 * another.
 */

/**
 * Join the env-specific base URL onto a design row's stored image keys. The DB holds
 * env-agnostic keys; the public base is joined at read time.
 *
 * Exported because generation detail resolves its parent design's images too.
 */
export function resolveDesignUrls<
  T extends { originalImageUrl: string; generatedImageUrl: string | null },
>(row: T): T {
  return {
    ...row,
    originalImageUrl: StorageService.publicUrl(row.originalImageUrl) ?? "",
    generatedImageUrl: StorageService.publicUrl(row.generatedImageUrl),
  };
}

export const DesignAdminService = {
  /** Paginated designs with backend search / filter / sort. */
  listPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([designs.style, designs.roomType, designs.anonymousId], params.search),
      ...equalFilters(
        {
          status: designs.status,
          roomType: designs.roomType,
          style: designs.style,
          session: designs.anonymousId,
        },
        params.filters,
      ),
    ]);
    const sortMap = {
      createdAt: designs.createdAt,
      style: designs.style,
      roomType: designs.roomType,
      status: designs.status,
    };
    const page = await paginate(
      params,
      db.select(sqlCount()).from(designs).where(where),
      (limit, offset) =>
        db
          .select()
          .from(designs)
          .where(where)
          .orderBy(withSorting(sortMap, params, designs.createdAt))
          .limit(limit)
          .offset(offset),
    );
    return { ...page, data: page.data.map(resolveDesignUrls) };
  },

  /** One design, for the detail page. */
  getById: async (id: string) => {
    const [design] = await db.select().from(designs).where(eq(designs.id, id));
    if (!design) return null;
    return { design: resolveDesignUrls(design) };
  },
};
