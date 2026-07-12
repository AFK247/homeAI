import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { DesignsList } from "./list";
import { designsPromises } from "./promises";

/*
 * Admin — all designs, backend-paginated. Builds promises from the URL
 * searchParams → QueryProvider awaits → DesignsList reads via useDataProvider.
 */
export default async function AdminDesignsPage({ searchParams }: PageSearchParams) {
  const promises = designsPromises(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Designs</h1>
      <QueryProvider promises={promises}>
        <DesignsList />
      </QueryProvider>
    </div>
  );
}
