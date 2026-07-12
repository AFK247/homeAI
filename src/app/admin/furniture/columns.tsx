"use client";

import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { FurnitureItem } from "@/db/types";
import { formatBdt } from "@/lib/format";

/*
 * Furniture table columns (reference convention: columns.tsx per feature).
 * Consumed by list.tsx via the shared DataTable.
 */
export const columns: DataTableColumn<FurnitureItem>[] = [
  { header: "Name", accessorKey: "name", sortable: true },
  { header: "Brand", accessorKey: "brand", cell: (r) => r.brand ?? "—" },
  { header: "Category", accessorKey: "category", cell: (r) => r.category ?? "—" },
  {
    header: "Price",
    accessorKey: "priceBdt",
    sortable: true,
    cell: (r) => (r.priceBdt !== null ? formatBdt(r.priceBdt, "en") : "—"),
  },
  {
    header: "Condition",
    accessorKey: "condition",
    cell: (r) => (
      <Badge variant={r.condition === "new" ? "default" : "secondary"}>{r.condition}</Badge>
    ),
  },
  { header: "Source", accessorKey: "source" },
];
