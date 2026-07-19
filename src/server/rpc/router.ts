import "server-only";

import { catalogRouter } from "@/app/admin/catalog/_modules/catalog.router";
import { categoryRouter } from "@/app/admin/categories/_modules/category.router";
import { designAdminRouter } from "@/app/admin/designs/_modules/design.router";
import { eventRouter } from "@/app/admin/events/_modules/event.router";
import { generationRouter } from "@/app/admin/generations/_modules/generation.router";
import { vendorRouter } from "@/app/admin/vendors/_modules/vendor.router";
import { designRouter } from "@/app/create/_modules/design.router";
import { furnitureRouter } from "@/app/result/_modules/furniture.router";
import { adminBillingRouter } from "@/server/service/admin-billing/admin-billing.router";
import { creditRouter } from "@/server/service/credit/credit.router";
import { paymentRouter } from "@/server/service/payment/payment.router";

/*
 * Root router (plan §5.4) — merges every module router into `webRouter`.
 * Add feature routers here as they land.
 */
export const webRouter = {
  design: designRouter,
  furniture: furnitureRouter,
  credit: creditRouter,
  payment: paymentRouter,
  adminBilling: adminBillingRouter,
  vendor: vendorRouter,
  event: eventRouter,
  generation: generationRouter,
  designAdmin: designAdminRouter,
  category: categoryRouter,
  catalog: catalogRouter,
};

export type WebRouter = typeof webRouter;
