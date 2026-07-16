import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { DesignsList } from "./list";

/*
 * Admin — all designs, backend-paginated. Reads flow through the oRPC router
 * (serverRpc). A ?session=<anonId> drill-in from the Sessions page is cleared via
 * the DataTable toolbar's Clear button (extraFilterKeys), like any other filter.
 */
export default async function AdminDesignsPage({ searchParams }: PageSearchParams) {
  const raw = await searchParams;

  return (
    <>
      <PageHeader title="Designs" />
      <Suspense fallback={<DataTableSkeleton />}>
        <DesignsList searchParams={raw} />
      </Suspense>
    </>
  );
}
