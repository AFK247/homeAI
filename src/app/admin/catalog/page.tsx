import { DownloadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { isLocal } from "@/server/rpc/local-only";
import { serverRpc } from "@/server/rpc/server";
import { CatalogClient } from "./catalog-client";

/*
 * Admin — catalog scraping (LOCAL operator tool). Lists the registered vendors with their
 * staged/ingested counts and drives the live scrape → compare → ingest flow. Heavy lifting
 * runs in the local `bun dev` process; hard-blocked in production (no browser on serverless).
 */
export default async function AdminCatalogPage() {
  const local = isLocal();
  const vendors = local ? await serverRpc.catalog.vendors() : [];

  return (
    <>
      <PageHeader
        title="Catalog scraping"
        description="Scrape vendor sites, compare against the catalog, and ingest — run locally."
        icon={<DownloadCloud className="size-5" />}
      />
      {local ? (
        <CatalogClient vendors={vendors} />
      ) : (
        <div className="rounded-2xl border border-border border-dashed bg-card p-8 text-center">
          <p className="font-semibold text-foreground">Available in local development only</p>
          <p className="mt-1 text-brand-body text-sm">
            Scraping drives a headless browser and long-running jobs, which can't run on the
            serverless production host. Run <code className="rounded bg-muted px-1">bun dev</code>{" "}
            on your machine to use this tool.
          </p>
        </div>
      )}
    </>
  );
}
