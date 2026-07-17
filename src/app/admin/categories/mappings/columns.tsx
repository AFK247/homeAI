"use client";

import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { VendorCategoryMapRow } from "../_modules/category.router";
import { MapActions } from "./map-actions";

/** Row shape: the mapping plus the category options for the remap dropdown. */
export type MapRow = VendorCategoryMapRow & {
  categoryOptions: { id: string; name: string }[];
};

export const columns: DataTableColumn<MapRow>[] = [
  { header: "Vendor category", accessorKey: "rawCategory", sortable: true },
  {
    header: "Mapped to",
    accessorKey: "categoryName",
    cell: (m) => m.categoryName ?? <span className="text-muted-foreground">—</span>,
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: (m) => (
      <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
    ),
  },
  { header: "Source", accessorKey: "source" },
  {
    header: "",
    accessorKey: "id",
    id: "actions",
    className: "text-right",
    cell: (m) => (
      <MapActions
        id={m.id}
        categoryId={m.categoryId}
        status={m.status}
        categories={m.categoryOptions}
      />
    ),
  },
];
