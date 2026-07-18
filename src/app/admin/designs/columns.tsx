"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/config/pages";
import type { Design } from "@/db/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  done: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

export const columns: DataTableColumn<Design>[] = [
  {
    header: "Preview",
    accessorKey: "generatedImageUrl",
    cell: (d) =>
      d.generatedImageUrl ? (
        <Image
          src={d.generatedImageUrl}
          alt={d.style}
          width={48}
          height={48}
          className="size-12 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-[10px] text-muted-foreground">
          —
        </div>
      ),
  },
  { header: "Room", accessorKey: "roomType" },
  { header: "Style", accessorKey: "style" },
  {
    header: "Status",
    accessorKey: "status",
    cell: (d) => <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>{d.status}</Badge>,
  },
  {
    header: "Session",
    accessorKey: "anonymousId",
    className: "font-mono text-xs",
    // Clickable → filter designs to this session.
    cell: (d) =>
      d.anonymousId ? (
        <Link
          href={`${PAGES.ADMIN.DESIGNS}?session=${encodeURIComponent(d.anonymousId)}`}
          className="text-primary hover:underline"
          title="Filter to this session"
        >
          {d.anonymousId.slice(0, 8)}…
        </Link>
      ) : (
        <span className="text-muted-foreground">{d.userId ? "user" : "—"}</span>
      ),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    className: "text-muted-foreground text-xs",
    cell: (d) => format(new Date(d.createdAt), "d MMM, HH:mm"),
  },
  {
    header: "",
    accessorKey: "id",
    id: "actions",
    stickyRight: true,
    className: "w-10 text-right",
    cell: (d) => (
      <Link
        href={PAGES.ADMIN.DESIGN_DETAIL(d.id)}
        aria-label="View design"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Eye className="size-4" />
      </Link>
    ),
  },
];
