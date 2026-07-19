import { Tags } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { CategoryTabs } from "../category-tabs";
import { MappingsList } from "./list";

/*
 * Admin — vendor→master category mappings (docs/marketplace-plan.md §3). A real sibling route of
 * Categories (not a query-param tab), reached via the shared CategoryTabs bar. Review/approve/
 * remap AI-proposed mappings; ingestion only uses ACTIVE ones. Backend-paginated.
 */
export default async function AdminCategoryMappingsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Categories"
        description="How each vendor's raw category resolves to a master category. Approve or remap AI proposals."
        icon={<Tags className="size-5" />}
      />

      <CategoryTabs active="mappings" />

      <Suspense fallback={<DataTableSkeleton />}>
        <MappingsList searchParams={params} />
      </Suspense>
    </>
  );
}
