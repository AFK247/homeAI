import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { VENDOR_TYPES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Vendors list — server component; reads through the oRPC router via serverRpc. */
export async function VendorsList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["type"] });
  const result = await serverRpc.vendor.getPaginated(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search vendors…"
      filters={[{ paramKey: "type", label: "Type", options: VENDOR_TYPES }]}
    />
  );
}
