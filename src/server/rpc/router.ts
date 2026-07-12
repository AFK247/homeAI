import "server-only";

import { designRouter } from "@/app/create/_modules/design.router";
import { furnitureRouter } from "@/app/result/_modules/furniture.router";

/*
 * Root router (plan §5.4) — merges every module router into `webRouter`.
 * Add feature routers here (vendor, billing) as they land.
 */
export const webRouter = {
  design: designRouter,
  furniture: furnitureRouter,
};

export type WebRouter = typeof webRouter;
