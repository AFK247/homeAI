import { ArrowLeft, Waypoints } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { PAGES } from "@/config/pages";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { MappingsList } from "./list";

/*
 * Admin — vendor→master category mappings (docs/marketplace-plan.md §3). Review/approve
 * AI-proposed mappings and REMAP any bad guesses to the right master category before they
 * go live. Ingestion only uses ACTIVE (approved) mappings.
 */
export default async function AdminCategoryMappingsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Category mappings"
        description="How each vendor's raw category resolves to a master category. Approve or remap AI proposals."
        icon={<Waypoints className="size-5" />}
        actions={
          <Link
            href={PAGES.ADMIN.CATEGORIES}
            className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Categories
          </Link>
        }
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <MappingsList searchParams={params} />
      </Suspense>
    </>
  );
}
