"use client";

import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatBdt } from "@/lib/format";
import type { FurnitureRow } from "../../result/_modules/furniture.router";

/*
 * Furniture table columns (reference convention: columns.tsx per feature).
 * Consumed by list.tsx via the shared DataTable.
 */
export const columns: DataTableColumn<FurnitureRow>[] = [
  { header: "Name", accessorKey: "name", sortable: true },
  { header: "Brand", accessorKey: "brand", cell: (r) => r.brand ?? "—" },
  {
    header: "Category",
    accessorKey: "categoryName",
    cell: (r) => (r.categoryName ? <span className="capitalize">{r.categoryName}</span> : "—"),
  },
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
