import "server-only";

import { searchParamsSchema } from "@/db/helpers/search-params";
import { adminProcedure } from "@/server/rpc/procedures";
import { EventService } from "./event.service";

/*
 * Event oRPC router — admin event log + type breakdown.
 * Convention (docs/module-convention.md): router validates + calls the service;
 * never touches Drizzle. GET for reads. Admin-only: every procedure requires role=admin (adminProcedure).
 */
export const eventRouter = {
  getPaginated: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => EventService.listPaginated(input)),

  countsByType: adminProcedure.route({ method: "GET" }).handler(() => EventService.countsByType()),
};

/** Row type for the events table — inferred, never hand-written. */
export type EventRow = Awaited<ReturnType<typeof EventService.listPaginated>>["data"][number];
