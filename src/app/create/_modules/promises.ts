import "server-only";

import type { AwaitedPromisesType } from "@/providers/query.provider";
import { designQueries } from "./design.queries";

/*
 * Server data-loading factory (reference convention: promises.ts). Returns an
 * object of un-awaited promises that a page hands to <QueryProvider>, which
 * awaits them on the server and exposes the resolved data via
 * useDataProvider<DesignDetailData>.
 *
 * Synchronous factory (like the reference): the anon-scoping is resolved inside
 * the query itself, so the returned values are promises the provider can await.
 */
export function designDetailPromises(id: string, anonymousId: string) {
  return {
    design: designQueries.getById({ id, anonymousId }),
  };
}

export type DesignDetailData = AwaitedPromisesType<typeof designDetailPromises>;

export function designListPromises(anonymousId: string) {
  return {
    designs: designQueries.listByAnon({ anonymousId }),
  };
}

export type DesignListData = AwaitedPromisesType<typeof designListPromises>;
