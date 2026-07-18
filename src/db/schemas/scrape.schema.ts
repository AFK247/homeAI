import { index, integer, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig } from "@/db/helpers/base.columns";

const { id, createdAt, updatedAt } = baseColumns;

/*
 * Catalog-scraping tables (admin/catalog UI). LOCAL-OPERATOR tooling: the scrape runs in the
 * local `bun dev` process (Playwright can't run on serverless), streams progress to the admin
 * UI over SSE, and CHECKPOINTS every product as it's found so a crash/stop/network-drop is
 * resumable. Staging is deliberately separate from `furnitureItems` — a partial or broken
 * scrape never touches the live catalog; ingest is an explicit second step.
 */

/** One row per scrape run. Drives live progress, stop, resume, and run history. */
export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id,
    vendor: text("vendor").notNull(), // registry slug, e.g. "hatil"
    // running → an active stream; done → finished cleanly; interrupted → crashed/errored
    // mid-run; cancelled → operator hit Stop. All non-running states are resumable.
    status: text("status").notNull().default("running"),
    totalUrls: integer("total_urls").notNull().default(0),
    doneUrls: integer("done_urls").notNull().default(0),
    failedUrls: integer("failed_urls").notNull().default(0),
    error: text("error"), // failure message when status = interrupted
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
    createdAt,
    updatedAt,
  },
  (t) => [index("scrape_jobs_vendor_idx").on(t.vendor)],
);

/**
 * Staging table — the checkpoint of each scraped product. Upserted by (vendor, sourceUrl):
 * re-scraping a URL updates its row, and `sourceUrl` is the resume/dedupe key (skip URLs
 * already staged). This is BOTH the "what has been scraped" the UI reads and the source
 * that ingest + the DB-diff read from.
 */
export const scrapedProducts = pgTable(
  "scraped_products",
  {
    id,
    vendor: text("vendor").notNull(),
    sourceUrl: text("source_url").notNull(),
    name: text("name").notNull(),
    priceBdt: numeric("price_bdt", numericConfig),
    category: text("category"),
    imageUrl: text("image_url"),
    dimensions: text("dimensions"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    createdAt,
    updatedAt,
  },
  (t) => [
    unique("scraped_products_vendor_source_url_uq").on(t.vendor, t.sourceUrl),
    index("scraped_products_vendor_idx").on(t.vendor),
  ],
);
