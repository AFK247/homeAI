import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { DESIGN_STYLES, GENERATION_STATUSES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Designs list — server component; reads through the oRPC router via serverRpc. */
export async function DesignsList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, {
    filterKeys: ["status", "roomType", "style", "session"],
  });
  const result = await serverRpc.designAdmin.getPaginated(params);
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search designs…"
      extraFilterKeys={["session"]}
      filters={[
        { paramKey: "status", label: "Status", options: GENERATION_STATUSES },
        { paramKey: "roomType", label: "Room", options: ROOM_TYPES },
        { paramKey: "style", label: "Style", options: DESIGN_STYLES },
      ]}
    />
  );
}
