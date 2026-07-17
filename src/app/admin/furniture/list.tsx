import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { FURNITURE_CONDITIONS, FURNITURE_SOURCES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Furniture list — server component; reads through the oRPC router via serverRpc. */
export async function FurnitureList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, {
    filterKeys: ["condition", "source", "brand", "categoryId"],
  });
  const result = await serverRpc.furniture.getPaginated(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search furniture…"
      filters={[
        { paramKey: "condition", label: "Condition", options: FURNITURE_CONDITIONS },
        { paramKey: "source", label: "Source", options: FURNITURE_SOURCES },
      ]}
    />
  );
}
