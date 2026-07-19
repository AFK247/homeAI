import { Tags } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { CategoryTabs } from "./category-tabs";
import { CategoriesList } from "./list";
import { NewCategoryButton } from "./new-category-button";
import { SeedCategoriesButton } from "./seed-button";

/*
 * Admin — master furniture categories (docs/marketplace-plan.md §3). The vocabulary both the
 * catalog and the AI resolve into. The shared CategoryTabs bar links to the sibling Vendor
 * mappings route (real page navigation). Backend-paginated via the oRPC router.
 */
export default async function AdminCategoriesPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Categories"
        description="The master furniture vocabulary. Pins and catalog products both resolve into these."
        icon={<Tags className="size-5" />}
        actions={
          <div className="flex items-center gap-3">
            <NewCategoryButton />
            <SeedCategoriesButton />
          </div>
        }
      />

      <CategoryTabs active="categories" />

      <Suspense fallback={<DataTableSkeleton />}>
        <CategoriesList searchParams={params} />
      </Suspense>
    </>
  );
}
