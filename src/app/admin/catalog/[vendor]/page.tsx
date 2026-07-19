import { notFound } from "next/navigation";
import { isLocal } from "@/server/rpc/local-only";
import { serverRpc } from "@/server/rpc/server";
import { CatalogClient } from "../catalog-client";

/*
 * A single vendor's scrape controls — renders BELOW the shared vendor cards (the layout owns the
 * header + cards). Scrape / resume / fresh / stop, live run panel, products, preview + publish,
 * all scoped to this vendor. Multiple vendors run concurrently; the cards above show them all.
 */
export default async function CatalogVendorPage({
  params,
}: {
  params: Promise<{ vendor: string }>;
}) {
  if (!isLocal()) return null; // layout renders the "local only" notice

  const { vendor: slug } = await params;
  const vendors = await serverRpc.catalog.vendors();
  const vendor = vendors.find((v) => v.slug === slug);
  if (!vendor) notFound();

  return <CatalogClient vendor={vendor} />;
}
