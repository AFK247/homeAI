import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { DESIGN_STYLES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { providerKeys } from "@/server/service/ai/providers/status";
import { columns } from "./columns";

/* Generation logs — server component; reads through the oRPC router via serverRpc. */
export async function GenerationsList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, {
    filterKeys: ["provider", "style", "roomType", "session", "designId"],
  });
  const result = await serverRpc.generation.getPaginated(params);
  const providers = providerKeys();
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search model / provider / session…"
      extraFilterKeys={["session", "designId"]}
      filters={[
        // Options come from the provider chain — never hardcode vendor names here.
        { paramKey: "provider", label: "Provider", options: providers },
        { paramKey: "roomType", label: "Room", options: ROOM_TYPES },
        { paramKey: "style", label: "Style", options: DESIGN_STYLES },
      ]}
    />
  );
}
