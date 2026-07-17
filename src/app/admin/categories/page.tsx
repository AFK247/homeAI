import { Tags, Waypoints } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { PAGES } from "@/config/pages";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { CategoriesList } from "./list";
import { NewCategoryButton } from "./new-category-button";
import { SeedCategoriesButton } from "./seed-button";

/*
 * Admin — master furniture categories (docs/marketplace-plan.md §3). The vocabulary both
 * the catalog and the AI resolve into. Approve AI-proposed (pending) categories here;
 * seed the initial list with one click. Backend-paginated via the oRPC router.
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
            <Link
              href={PAGES.ADMIN.CATEGORY_MAPPINGS}
              className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
            >
              <Waypoints className="size-4" /> Mappings
            </Link>
            <NewCategoryButton />
            <SeedCategoriesButton />
          </div>
        }
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <CategoriesList searchParams={params} />
      </Suspense>
    </>
  );
}
