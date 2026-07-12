import "server-only";

import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import type { AwaitedPromisesType } from "@/providers/query.provider";
import { AdminService } from "../_modules/admin.service";

/* Events list data-loading factory (co-located per feature). */
export function eventsPromises(raw: RawSearchParams) {
  const params = parseListParams(raw, { filterKeys: ["eventType"] });
  return { result: AdminService.paginatedEvents(params), breakdown: AdminService.eventBreakdown() };
}
export type EventsPageData = AwaitedPromisesType<typeof eventsPromises>;
