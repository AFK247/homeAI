import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { VendorsList } from "./list";
import { vendorsPromises } from "./promises";

/* Admin — vendors, backend-paginated via QueryProvider + useDataProvider. */
export default async function AdminVendorsPage({ searchParams }: PageSearchParams) {
  const promises = vendorsPromises(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Vendors</h1>
      <QueryProvider promises={promises}>
        <VendorsList />
      </QueryProvider>
    </div>
  );
}
