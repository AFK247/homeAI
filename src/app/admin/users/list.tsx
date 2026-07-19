import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Users & usage list — server component; reads through the oRPC router via serverRpc. */
export async function UsersUsageList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["type"] });
  const result = await serverRpc.adminBilling.usersUsage(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      keyField="accountId"
      filters={[
        { paramKey: "type", label: "Type", options: ["paid", "free", "registered", "anonymous"] },
      ]}
    />
  );
}
