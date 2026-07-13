"use client";

import { DataTable } from "@/components/data-table/data-table";
import { DESIGN_STYLES, ROOM_TYPES } from "@/db/schemas/shared.schema";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { GenerationsPageData } from "./promises";

/* Generation logs — reads its data + stats from the DataProvider (not props). */
export function GenerationsList() {
  const { result } = useDataProvider<GenerationsPageData>();
  return (
    <DataTable
      columns={columns}
      data={result.data}
      total={result.total}
      page={result.page}
      pageCount={result.pageCount}
      size={result.size}
      searchPlaceholder="Search model / provider / session…"
      filters={[
        { paramKey: "provider", label: "Provider", options: ["openrouter", "cloudflare"] },
        { paramKey: "roomType", label: "Room", options: ROOM_TYPES },
        { paramKey: "style", label: "Style", options: DESIGN_STYLES },
      ]}
    />
  );
}
