import { Button } from "@/components/ui/button";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { FurnitureList } from "./list";
import { furniturePromises } from "./promises";

/* Admin — furniture catalog, backend-paginated via QueryProvider + useDataProvider. */
export default async function AdminFurniturePage({ searchParams }: PageSearchParams) {
  const promises = furniturePromises(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Furniture</h1>
        <Button>New item</Button>
      </div>
      <QueryProvider promises={promises}>
        <FurnitureList />
      </QueryProvider>
    </div>
  );
}
