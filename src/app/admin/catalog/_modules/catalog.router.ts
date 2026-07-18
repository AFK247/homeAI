import "server-only";

import { z } from "zod";
import { assertLocalOnly } from "@/server/rpc/local-only";
import { adminProcedure } from "@/server/rpc/procedures";
import { CatalogService } from "./catalog.service";

/*
 * Catalog-scraping oRPC router. Admin-only reads (vendors/staged/jobs/diff) plus the ingest
 * mutation. The live SCRAPE stream is NOT here — it's an SSE route handler
 * (src/app/api/admin/scrape/[vendor]/route.ts), since oRPC returns a value, not a stream.
 *
 * ingest is guarded by assertLocalOnly() too: it's part of the local operator flow and reads
 * from the local scrape staging table.
 */
const vendorInput = z.object({ vendor: z.string().min(1) });

export const catalogRouter = {
  vendors: adminProcedure.route({ method: "GET" }).handler(() => CatalogService.vendors()),

  staged: adminProcedure
    .route({ method: "GET" })
    .input(vendorInput)
    .handler(({ input }) => CatalogService.staged(input.vendor)),

  jobs: adminProcedure
    .route({ method: "GET" })
    .input(vendorInput)
    .handler(({ input }) => CatalogService.jobs(input.vendor)),

  diff: adminProcedure
    .route({ method: "GET" })
    .input(vendorInput)
    .handler(({ input }) => CatalogService.diff(input.vendor)),

  ingest: adminProcedure
    .route({ method: "POST" })
    .input(vendorInput)
    .handler(({ input }) => {
      assertLocalOnly();
      return CatalogService.ingestVendor(input.vendor);
    }),
};

/** Inferred row/result types for the UI — never hand-written. */
export type CatalogVendor = Awaited<ReturnType<typeof CatalogService.vendors>>[number];
export type StagedRow = Awaited<ReturnType<typeof CatalogService.staged>>[number];
export type ScrapeJobRow = Awaited<ReturnType<typeof CatalogService.jobs>>[number];
export type CatalogDiff = Awaited<ReturnType<typeof CatalogService.diff>>;
export type IngestResult = Awaited<ReturnType<typeof CatalogService.ingestVendor>>;
