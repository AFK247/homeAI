"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import Link from "next/link";
import type { SessionRow } from "@/app/admin/sessions/_modules/session.router";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { PAGES } from "@/config/pages";

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
  {
    header: "",
    accessorKey: "anonymousId",
    id: "actions", // distinct key — shares accessorKey with the session-id column
    className: "w-10 text-right",
    // Drill into this session's designs (filtered).
    cell: (s) =>
      s.anonymousId ? (
        <Link
          href={`${PAGES.ADMIN.DESIGNS}?session=${encodeURIComponent(s.anonymousId)}`}
          aria-label="View this session's designs"
          title="View designs"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Eye className="size-4" />
        </Link>
      ) : null,
  },
];
