import "server-only";

import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { CreateVendorSchema, UpdateVendorSchema } from "@/db/validations/vendor.validation";
import { adminProcedure } from "@/server/rpc/procedures";
import { VendorService } from "./vendor.service";

/*
 * Vendor oRPC router — the API surface for the vendors entity.
 *
 * Convention (see docs/module-convention.md): router validates + calls the service;
 * it never touches Drizzle. `.route({ method })` is explicit — GET for reads, POST
 * for every mutation (create/update/delete are all POST, matching the reference).
 *
 * Admin-only: every procedure requires role=admin (adminProcedure). When Better Auth lands, add
 * `.use(withPermission(...))` to each procedure — no other change.
 */
export const vendorRouter = {
  // ── reads ──────────────────────────────────────────────
  getPaginated: adminProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => VendorService.listPaginated(input)),

  getById: adminProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => VendorService.getById(input.id)),

  // ── mutations ──────────────────────────────────────────
  create: adminProcedure
    .route({ method: "POST" })
    .input(CreateVendorSchema)
    .handler(({ input }) => VendorService.create(input)),

  update: adminProcedure
    .route({ method: "POST" })
    .input(UpdateVendorSchema)
    .handler(({ input }) => VendorService.update(input)),

  delete: adminProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => VendorService.remove(input.id)),
};

/** Row type for the vendors table — inferred from the service, never hand-written. */
export type VendorRow = Awaited<ReturnType<typeof VendorService.listPaginated>>["data"][number];
