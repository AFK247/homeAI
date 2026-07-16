import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { SessionsList } from "./list";

/*
 * Admin — anonymous sessions (no auth yet). Keyed by cookie id; becomes real
 * user accounts once Better Auth lands.
 */
export default function AdminSessionsPage() {
  return (
    <>
      <PageHeader
        title="Sessions"
        description="No login yet — these are anonymous sessions (cookie id). They become real user accounts once auth is wired."
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <SessionsList />
      </Suspense>
    </>
  );
}
