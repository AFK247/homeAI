import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { CREDIT_KINDS, CREDIT_REASONS } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Credit ledger list — server component; reads through the oRPC router via serverRpc. */
export async function LedgerList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["kind", "reason"] });
  const result = await serverRpc.adminBilling.ledger(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      keyField="id"
      filters={[
        { paramKey: "kind", label: "Kind", options: CREDIT_KINDS },
        { paramKey: "reason", label: "Reason", options: CREDIT_REASONS },
      ]}
    />
  );
}
