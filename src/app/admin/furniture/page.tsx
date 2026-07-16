import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { FurnitureList } from "./list";

/* Admin — furniture catalog, backend-paginated. Reads flow through the oRPC router. */
export default async function AdminFurniturePage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader title="Furniture" actions={<Button>New item</Button>} />
      <Suspense fallback={<DataTableSkeleton />}>
        <FurnitureList searchParams={params} />
      </Suspense>
    </>
  );
}
