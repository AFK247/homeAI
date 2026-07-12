"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DESIGN_STYLES, GENERATION_STATUSES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { DesignsPageData } from "./promises";

/* Designs list — reads its data from the DataProvider (not props). */
export function DesignsList() {
  const { result } = useDataProvider<DesignsPageData>();
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search designs…"
      filters={[
        { paramKey: "status", label: "Status", options: GENERATION_STATUSES },
        { paramKey: "roomType", label: "Room", options: ROOM_TYPES },
        { paramKey: "style", label: "Style", options: DESIGN_STYLES },
      ]}
    />
  );
}
