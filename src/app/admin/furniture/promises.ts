import "server-only";

import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import type { AwaitedPromisesType } from "@/providers/query.provider";
import { FurnitureService } from "@/server/service/furniture.service";

/* Furniture list data-loading factory (co-located per feature). */
export function furniturePromises(raw: RawSearchParams) {
  const params = parseListParams(raw, { filterKeys: ["condition", "source", "brand", "category"] });
  return { result: FurnitureService.list(params) };
}
export type FurniturePageData = AwaitedPromisesType<typeof furniturePromises>;
