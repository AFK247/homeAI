"use client";

import { format } from "date-fns";
import Image from "next/image";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
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
    className: "font-mono text-muted-foreground text-xs",
    cell: (d) => (d.anonymousId ? `${d.anonymousId.slice(0, 8)}…` : d.userId ? "user" : "—"),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    className: "text-muted-foreground text-xs",
    cell: (d) => format(new Date(d.createdAt), "d MMM, HH:mm"),
  },
];
