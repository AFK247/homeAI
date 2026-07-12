import "server-only";

import type { PromiseResult } from "@/lib/types/utils";
import { DesignService } from "./design.service";

/*
 * Design query wrappers (reference convention: *.queries.ts). Cached read
 * functions that call the service. These are composed by promises.ts and awaited
 * on the server via QueryProvider.
 *
 * Cache: reads are wrapped with 'use cache' once the cacheConfig/cacheKey
 * helpers land (plan §6). Left uncached for now so freshly generated designs
 * appear immediately; add 'use cache' + a design cacheKey when caching is wired.
 */
export const designQueries = {
  getById: (params: { id: string; anonymousId: string }) => DesignService.getById(params),
  listByAnon: (params: { anonymousId: string }) => DesignService.listByAnon(params),
};

export type DesignDetail = PromiseResult<typeof designQueries.getById>;
export type DesignList = PromiseResult<typeof designQueries.listByAnon>;
