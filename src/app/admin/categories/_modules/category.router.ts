import "server-only";

import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { CreateCategorySchema, UpdateCategorySchema } from "@/db/validations/category.validation";
import { publicProcedure } from "@/server/rpc/procedures";
import { CategoryService } from "./category.service";

/*
 * Category oRPC router — the master furniture vocabulary + vendor→master mappings
 * (docs/marketplace-plan.md §3). Router validates + calls the service; never touches
 * Drizzle. GET for reads, POST for mutations. No auth yet (publicProcedure).
 */
export const categoryRouter = {
  // ── categories: reads ──────────────────────────────────
  getPaginated: publicProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => CategoryService.listPaginated(input)),

  getById: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CategoryService.getById(input.id)),

  listActive: publicProcedure.route({ method: "GET" }).handler(() => CategoryService.listActive()),

  // ── categories: mutations ──────────────────────────────
  create: publicProcedure
    .route({ method: "POST" })
    .input(CreateCategorySchema)
    .handler(({ input }) => CategoryService.create(input)),

  update: publicProcedure
    .route({ method: "POST" })
    .input(UpdateCategorySchema)
    .handler(({ input }) => CategoryService.update(input)),

  approve: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CategoryService.approve(input.id)),

  delete: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CategoryService.remove(input.id)),

  seed: publicProcedure.route({ method: "POST" }).handler(() => CategoryService.seed()),

  // ── vendor→master mappings ─────────────────────────────
  getMapsPaginated: publicProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => CategoryService.listMapsPaginated(input)),

  approveMap: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CategoryService.approveMap(input.id)),

  updateMap: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1), categoryId: z.string().min(1) }))
    .handler(({ input }) => CategoryService.updateMap(input.id, input.categoryId)),

  deleteMap: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CategoryService.removeMap(input.id)),

  // AI-map a vendor's raw categories → master (writes pending for review).
  mapVendorCategories: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ vendorId: z.string().min(1), rawCategories: z.array(z.string()) }))
    .handler(({ input }) =>
      CategoryService.mapVendorCategories(input.vendorId, input.rawCategories),
    ),
};

/** Row types — inferred from the service, never hand-written. */
export type CategoryRow = Awaited<ReturnType<typeof CategoryService.listPaginated>>["data"][number];
export type VendorCategoryMapRow = Awaited<
  ReturnType<typeof CategoryService.listMapsPaginated>
>["data"][number];
