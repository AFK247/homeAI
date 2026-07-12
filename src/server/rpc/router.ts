import "server-only";

import { designRouter } from "@/app/create/_modules/design.router";

/*
 * Root router (plan §5.4) — merges every module router into `webRouter`.
 * Add feature routers here (furniture, vendor, billing) as they land.
 */
export const webRouter = {
  design: designRouter,
};

export type WebRouter = typeof webRouter;
