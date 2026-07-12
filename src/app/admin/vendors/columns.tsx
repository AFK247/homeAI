"use client";

import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { Vendor } from "@/db/types";

export const columns: DataTableColumn<Vendor>[] = [
  { header: "Name", accessorKey: "name", sortable: true },
  { header: "Type", accessorKey: "type" },
  {
    header: "Website",
    accessorKey: "websiteUrl",
    cell: (v) =>
      v.websiteUrl ? (
        <a
          href={v.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {v.websiteUrl.replace(/^https?:\/\//, "")}
        </a>
      ) : (
        "—"
      ),
  },
  {
    header: "Verified",
    accessorKey: "isVerified",
    cell: (v) => (
      <Badge variant={v.isVerified ? "default" : "secondary"}>
        {v.isVerified ? "Verified" : "Unverified"}
      </Badge>
    ),
  },
];
