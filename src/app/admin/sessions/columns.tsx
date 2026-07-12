"use client";

import { format } from "date-fns";
import type { SessionRow } from "@/app/admin/_modules/admin.service";
import type { DataTableColumn } from "@/components/data-table/data-table";

export const columns: DataTableColumn<SessionRow>[] = [
  {
    header: "Session (anon id)",
    accessorKey: "anonymousId",
    className: "font-mono text-foreground text-xs",
    cell: (s) => s.anonymousId ?? "—",
  },
  { header: "Designs", accessorKey: "designCount", sortable: true },
  {
    header: "Last active",
    accessorKey: "lastActive",
    sortable: true,
    className: "text-muted-foreground text-xs",
    cell: (s) => format(new Date(s.lastActive), "d MMM yyyy, HH:mm"),
  },
];
