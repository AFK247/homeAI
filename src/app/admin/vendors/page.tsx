import { Store } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { VendorsList } from "./list";
import { NewVendorButton } from "./new-vendor-button";

/* Admin — vendors, backend-paginated. Reads flow through the oRPC router (serverRpc). */
export default async function AdminVendorsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Furniture suppliers whose products fill the catalog."
        icon={<Store className="size-5" />}
        actions={<NewVendorButton />}
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <VendorsList searchParams={params} />
      </Suspense>
    </>
  );
}
