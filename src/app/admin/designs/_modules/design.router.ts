import "server-only";

import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { adminProcedure } from "@/server/rpc/procedures";
import { DesignAdminService } from "./design.service";

/*
 * Design (admin) oRPC router — admin-scoped design list + detail, across all
 * sessions. Distinct from the customer `design` router (anon-scoped, in create/).
 * Convention (docs/module-convention.md): router validates + calls the service;
 * never touches Drizzle. GET for reads. Admin-only: every procedure requires role=admin (adminProcedure).
 */
export const designAdminRouter = {
  getPaginated: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => DesignAdminService.listPaginated(input)),

  getById: adminProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => DesignAdminService.getById(input.id)),
};

/** Row + detail types for the designs UI — inferred, never hand-written. */
export type DesignRow = Awaited<
  ReturnType<typeof DesignAdminService.listPaginated>
>["data"][number];
export type DesignDetail = Awaited<ReturnType<typeof DesignAdminService.getById>>;
