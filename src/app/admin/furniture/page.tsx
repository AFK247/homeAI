import { Boxes } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { FurnitureList } from "./list";
import { NewItemButton } from "./new-item-button";

/* Admin — furniture catalog, backend-paginated with full CRUD. Reads flow through the oRPC router. */
export default async function AdminFurniturePage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Furniture"
        description="The local catalog every furniture pin links to. Add, edit, or remove items."
        icon={<Boxes className="size-5" />}
        actions={<NewItemButton />}
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <FurnitureList searchParams={params} />
      </Suspense>
    </>
  );
}
