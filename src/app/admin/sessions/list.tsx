import { DataTable } from "@/components/data-table/data-table";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Sessions list — server component; reads through the oRPC router via serverRpc.
 * No `rowKey` prop: it's a function, and a server component can't pass functions to
 * the client DataTable. DataTable keys off `anonymousId` (see keyField) instead. */
export async function SessionsList() {
  const sessions = await serverRpc.session.list();
  return <DataTable columns={columns} data={sessions} keyField="anonymousId" />;
}
