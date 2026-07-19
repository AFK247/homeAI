import "server-only";

import { searchParamsSchema } from "@/db/helpers/search-params";
import { adminProcedure } from "@/server/rpc/procedures";
import { AdminBillingService } from "./admin-billing.service";

/*
 * Admin billing router — read-only analytics over credits + payments. Admin-only (adminProcedure
 * rejects non-admins server-side). GET reads; validation + auth only, all queries in the service.
 */
export const adminBillingRouter = {
  segments: adminProcedure.route({ method: "GET" }).handler(() => AdminBillingService.segments()),

  revenueSummary: adminProcedure
    .route({ method: "GET" })
    .handler(() => AdminBillingService.revenueSummary()),

  usersUsage: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => AdminBillingService.usersUsage(input)),

  payments: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => AdminBillingService.payments(input)),

  ledger: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => AdminBillingService.ledger(input)),
};
