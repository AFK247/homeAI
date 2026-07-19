"use client";

import { format } from "date-fns";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { PaymentRow } from "@/server/service/admin-billing/admin-billing.service";

const STATUS_META: Record<
  PaymentRow["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  success: { label: "Success", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export const columns: DataTableColumn<PaymentRow>[] = [
  {
    header: "Buyer",
    accessorKey: "userEmail",
    className: "text-foreground",
    cell: (p) => (
      <div className="flex flex-col">
        <span className="font-medium">{p.userName ?? "—"}</span>
        <span className="text-muted-foreground text-xs">{p.userEmail ?? "—"}</span>
      </div>
    ),
  },
  {
    header: "Amount",
    accessorKey: "amountBdt",
    className: "tabular-nums text-foreground",
    cell: (p) => `৳${p.amountBdt.toLocaleString("en-US")}`,
  },
  {
    header: "Credits",
    accessorKey: "credits",
    className: "tabular-nums",
    cell: (p) => p.credits.toLocaleString("en-US"),
  },
  {
    header: "Status",
    accessorKey: "status",
    cell: (p) => {
      const m = STATUS_META[p.status];
      return <Badge variant={m.variant}>{m.label}</Badge>;
    },
  },
  {
    header: "Tran ID",
    accessorKey: "tranId",
    className: "font-mono text-muted-foreground text-xs",
    cell: (p) => p.tranId,
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    className: "text-muted-foreground text-xs",
    cell: (p) => format(new Date(p.createdAt), "d MMM yyyy, HH:mm"),
  },
];
