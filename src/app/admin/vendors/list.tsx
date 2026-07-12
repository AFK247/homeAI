"use client";

import { DataTable } from "@/components/data-table/data-table";
import { VENDOR_TYPES } from "@/db/schemas/shared.schema";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { VendorsPageData } from "./promises";

/* Vendors list — reads its data from the DataProvider (not props). */
export function VendorsList() {
  const { result } = useDataProvider<VendorsPageData>();
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
