import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { GenerationsList } from "./list";
import { GenerationStats } from "./stats";

/*
 * Admin — AI generation logs, backend-paginated. Shows headline KPIs (spend,
 * success rate, avg latency) plus the full per-generation table. Row eye-icon →
 * generation detail. ?session= / ?designId= drill-ins from the Sessions / Designs
 * pages are cleared via the DataTable toolbar's Clear button (extraFilterKeys).
 */
export default async function AdminGenerationsPage({ searchParams }: PageSearchParams) {
  const raw = await searchParams;

  return (
    <>
      <PageHeader title="Generations" />
      <Suspense fallback={<DataTableSkeleton />}>
        <GenerationStats />
        <GenerationsList searchParams={raw} />
      </Suspense>
    </>
  );
}
