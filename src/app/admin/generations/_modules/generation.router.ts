import "server-only";

import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { publicProcedure } from "@/server/rpc/procedures";
import { GenerationService } from "./generation.service";

/*
 * Generation oRPC router — admin AI-generation logs (list, stats, per-provider
 * counts, detail). Convention (docs/module-convention.md): router validates + calls
 * the service; never touches Drizzle. GET for reads. No auth yet (publicProcedure).
 */
export const generationRouter = {
  getPaginated: publicProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => GenerationService.listPaginated(input)),

  stats: publicProcedure.route({ method: "GET" }).handler(() => GenerationService.stats()),

  countsByProvider: publicProcedure
    .route({ method: "GET" })
    .handler(() => GenerationService.countsByProvider()),

  getById: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => GenerationService.getById(input.id)),
};

/** Row + detail types for the generations UI — inferred, never hand-written. */
export type GenerationLogRow = Awaited<
  ReturnType<typeof GenerationService.listPaginated>
>["data"][number];
export type GenerationDetail = Awaited<ReturnType<typeof GenerationService.getById>>;
