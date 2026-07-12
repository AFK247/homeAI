"use client";

import { format } from "date-fns";
import type { EventRow } from "@/app/admin/_modules/admin.service";
import type { DataTableColumn } from "@/components/data-table/data-table";

export const columns: DataTableColumn<EventRow>[] = [
  {
    header: "Type",
    accessorKey: "eventType",
    className: "font-semibold text-foreground",
  },
  {
    header: "Session",
    accessorKey: "anonymousId",
    className: "font-mono text-muted-foreground text-xs",
    cell: (e) => (e.anonymousId ? `${e.anonymousId.slice(0, 8)}…` : "—"),
  },
  {
    header: "Metadata",
    accessorKey: "metadata",
    className: "font-mono text-muted-foreground text-xs",
    cell: (e) => (e.metadata ? JSON.stringify(e.metadata) : "—"),
  },
  {
    header: "When",
    accessorKey: "createdAt",
    sortable: true,
    className: "text-muted-foreground text-xs",
    cell: (e) => format(new Date(e.createdAt), "d MMM, HH:mm"),
  },
];
