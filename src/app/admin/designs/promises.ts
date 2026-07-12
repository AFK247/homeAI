import "server-only";

import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import type { AwaitedPromisesType } from "@/providers/query.provider";
import { AdminService } from "../_modules/admin.service";

/* Designs list data-loading factory (co-located per feature). */
export function designsPromises(raw: RawSearchParams) {
  const params = parseListParams(raw, { filterKeys: ["status", "roomType", "style"] });
  return { result: AdminService.paginatedDesigns(params) };
}
export type DesignsPageData = AwaitedPromisesType<typeof designsPromises>;
