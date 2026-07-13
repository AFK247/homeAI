"use client";

import { DataTable } from "@/components/data-table/data-table";
import { columns, type ProviderRow } from "./columns";

/* Provider chain — static list (no pagination), rendered via the reusable DataTable. */
export function ProviderList({ data }: { data: ProviderRow[] }) {
  return <DataTable columns={columns} data={data} emptyMessage="No providers configured." />;
}
