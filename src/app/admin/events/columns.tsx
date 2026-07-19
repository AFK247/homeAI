"use client";

import type { EventRow } from "@/app/admin/events/_modules/event.router";
import { getCellDateColumn } from "@/components/data-table/column-cells";
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
  getCellDateColumn({ header: "When", accessorKey: "createdAt" }),
];
