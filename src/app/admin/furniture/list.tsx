"use client";

import { DataTable } from "@/components/data-table/data-table";
import { FURNITURE_CONDITIONS, FURNITURE_SOURCES } from "@/db/schemas/shared.schema";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { FurniturePageData } from "./promises";

/* Furniture list — reads its data from the DataProvider (not props). */
export function FurnitureList() {
  const { result } = useDataProvider<FurniturePageData>();
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
