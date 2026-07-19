import { DownloadCloud } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { isLocal } from "@/server/rpc/local-only";
import { serverRpc } from "@/server/rpc/server";
import { CatalogTabs } from "./catalog-tabs";

/*
 * Shared catalog layout. The vendor cards render here as a CONSTANT "tab bar" on top of every
 * catalog page — the overview redirect and each /admin/catalog/[vendor] page. Clicking a card
 * navigates to that vendor's page below; the cards themselves never move (like tabs). Each card
 * shows the vendor's LIVE scrape status, so all concurrent runs are visible at a glance from any
 * vendor's page. Hard-blocked in production (no headless browser / long jobs on serverless).
 */
export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const local = isLocal();

  if (!local) {
    return (
      <>
        <PageHeader
          title="Catalog scraping"
          description="Scrape vendor sites into staging, then publish to the live catalog."
          icon={<DownloadCloud className="size-5" />}
        />
        <div className="rounded-2xl border border-border border-dashed bg-card p-8 text-center">
          <p className="font-semibold text-foreground">Available in local development only</p>
          <p className="mt-1 text-brand-body text-sm">
            Scraping drives a headless browser and long-running jobs, which can't run on the
            serverless production host. Run <code className="rounded bg-muted px-1">bun dev</code>{" "}
            on your machine to use this tool.
          </p>
        </div>
      </>
    );
  }

  const vendors = await serverRpc.catalog.allStatus();

  return (
    <>
      <PageHeader
        title="Catalog scraping"
        description="Pick a vendor to scrape its site into staging, then publish to the live catalog."
        icon={<DownloadCloud className="size-5" />}
      />
      {/* The constant vendor "tab bar" — stays put across every vendor page. */}
      <CatalogTabs initial={vendors} />
      {/* The selected vendor's page renders below the cards. */}
      <div className="mt-6">{children}</div>
    </>
  );
}
