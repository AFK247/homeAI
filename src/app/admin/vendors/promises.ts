import "server-only";

import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import type { AwaitedPromisesType } from "@/providers/query.provider";
import { AdminService } from "../_modules/admin.service";

/* Vendors list data-loading factory (co-located per feature). */
export function vendorsPromises(raw: RawSearchParams) {
  const params = parseListParams(raw, { filterKeys: ["type"] });
  return { result: AdminService.paginatedVendors(params) };
}
export type VendorsPageData = AwaitedPromisesType<typeof vendorsPromises>;
