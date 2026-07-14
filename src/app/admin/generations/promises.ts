import "server-only";

import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import type { AwaitedPromisesType } from "@/providers/query.provider";
import { AdminService } from "../_modules/admin.service";

/* Generation-logs list data-loading factory (co-located per feature). */
export function generationsPromises(raw: RawSearchParams) {
  const params = parseListParams(raw, {
    filterKeys: ["provider", "style", "roomType", "session", "designId"],
  });
  return {
    result: AdminService.paginatedGenerationLogs(params),
    stats: AdminService.generationStats(),
  };
}
export type GenerationsPageData = AwaitedPromisesType<typeof generationsPromises>;
