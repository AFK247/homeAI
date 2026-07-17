import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { CATEGORY_STATUSES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Categories list — server component; reads through the oRPC router via serverRpc. */
export async function CategoriesList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["status", "source"] });
  const result = await serverRpc.category.getPaginated(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      keyField="id"
      searchPlaceholder="Search categories…"
      filters={[{ paramKey: "status", label: "Status", options: CATEGORY_STATUSES }]}
    />
  );
}
