import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { EventsList } from "./list";

/*
 * Admin — event log + breakdown. Product events (generation, tag_click,
 * buy_click, share, save) are the vendor sales-pitch metrics (§14).
 */
export default async function AdminEventsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader title="Events" />
      <Suspense fallback={<DataTableSkeleton />}>
        <EventsList searchParams={params} />
      </Suspense>
    </>
  );
}
