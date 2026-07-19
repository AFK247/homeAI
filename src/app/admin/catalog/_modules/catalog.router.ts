import "server-only";

import { z } from "zod";
import { assertLocalOnly } from "@/server/rpc/local-only";
import { adminProcedure } from "@/server/rpc/procedures";
import { CatalogService } from "./catalog.service";

/*
 * Catalog-scraping oRPC router. Admin-only. The scrape now runs as a DETACHED background job
 * (src/server/service/catalog/scrape-runner.ts) — `startScrape` kicks it off and returns instantly,
 * the UI POLLS `runStatus`, and `stopScrape` aborts it. So the scrape survives a page refresh /
 * navigation (no SSE stream tied to the request). Local-operator-only mutations assert local.
 */
const vendorInput = z.object({ vendor: z.string().min(1) });

export const catalogRouter = {
  vendors: adminProcedure.route({ method: "GET" }).handler(() => CatalogService.vendors()),

  // Live status of ALL vendors at once (overview cards' badges — see every concurrent scrape).
  allStatus: adminProcedure.route({ method: "GET" }).handler(() => CatalogService.allStatus()),

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

  // ── detached scrape control (polled by the UI) ──────────────────────────────
  runStatus: adminProcedure
    .route({ method: "GET" })
    .input(vendorInput)
    .handler(({ input }) => CatalogService.runStatus(input.vendor)),

  startScrape: adminProcedure
    .route({ method: "POST" })
    .input(vendorInput.extend({ fresh: z.boolean().default(false) }))
    .handler(({ input }) => {
      assertLocalOnly();
      return CatalogService.startScrape(input.vendor, input.fresh);
    }),

  stopScrape: adminProcedure
    .route({ method: "POST" })
    .input(vendorInput)
    .handler(({ input }) => {
      assertLocalOnly();
      return CatalogService.stopScrape(input.vendor);
    }),

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
export type RunStatus = Awaited<ReturnType<typeof CatalogService.runStatus>>;
export type VendorStatus = Awaited<ReturnType<typeof CatalogService.allStatus>>[number];
