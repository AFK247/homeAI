"use client";

import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { CategoryRow } from "./_modules/category.router";
import { CategoryRowActions } from "./row-actions";

export const columns: DataTableColumn<CategoryRow>[] = [
  { header: "Name", accessorKey: "name", sortable: true },
  {
    header: "AI-detected in",
    accessorKey: "roomTypes",
    // Which rooms the vision detector looks for this category in.
    cell: (c) =>
      c.roomTypes.length ? (
        <span className="flex flex-wrap gap-1">
          {c.roomTypes.map((r) => (
            <Badge key={r} variant="secondary" className="font-normal">
              {r.replace(/_/g, " ")}
            </Badge>
          ))}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    header: "Status",
    accessorKey: "status",
    sortable: true,
    cell: (c) => (
      <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
    ),
  },
  {
    header: "Source",
    accessorKey: "source",
    cell: (c) => (
      <Badge variant="secondary" className="font-normal">
        {c.source}
      </Badge>
    ),
  },
  {
    header: "",
    accessorKey: "id",
    id: "actions",
    stickyRight: true,
    className: "text-right",
    cell: (c) => <CategoryRowActions category={c} />,
  },
];
