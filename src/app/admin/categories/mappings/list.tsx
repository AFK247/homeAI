import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { CATEGORY_STATUSES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Vendor→master mappings list — reads through the oRPC router via serverRpc. Each row
 * carries the active-category options so the remap dropdown can render client-side. */
export async function MappingsList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["status"] });
  const [result, activeCategories] = await Promise.all([
    serverRpc.category.getMapsPaginated(params),
    serverRpc.category.listActive(),
  ]);
  const categoryOptions = activeCategories
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const data = result.data.map((m) => ({ ...m, categoryOptions }));

  return (
    <DataTable
      columns={columns}
      data={data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      keyField="id"
      searchPlaceholder="Search vendor categories…"
      filters={[{ paramKey: "status", label: "Status", options: CATEGORY_STATUSES }]}
    />
  );
}
