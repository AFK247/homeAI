"use client";

import { format } from "date-fns";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LedgerRow } from "@/server/service/admin-billing/admin-billing.service";

export const columns: DataTableColumn<LedgerRow>[] = [
  {
    header: "Owner",
    accessorKey: "userEmail",
    className: "text-foreground",
    // Users show email; anonymous accounts show a shortened anon id.
    cell: (r) =>
      r.userEmail ? (
        <span className="text-sm">{r.userEmail}</span>
      ) : (
        <span className="font-mono text-muted-foreground text-xs">
          {r.anonymousId ? `${r.anonymousId.slice(0, 12)}…` : "—"}
        </span>
      ),
  },
  {
    header: "Reason",
    accessorKey: "reason",
    cell: (r) => <span className="text-foreground text-sm">{r.reason.replace(/_/g, " ")}</span>,
  },
  {
    header: "Kind",
    accessorKey: "kind",
    cell: (r) => <Badge variant={r.kind === "paid" ? "default" : "secondary"}>{r.kind}</Badge>,
  },
  {
    header: "Δ",
    accessorKey: "delta",
    className: "tabular-nums font-medium",
    // Green for credit in, red for debit.
    cell: (r) => (
      <span className={cn(r.delta >= 0 ? "text-primary" : "text-destructive")}>
        {r.delta >= 0 ? "+" : ""}
        {r.delta.toLocaleString("en-US")}
      </span>
    ),
  },
  {
    header: "Balance after (free / paid)",
    accessorKey: "paidAfter",
    className: "tabular-nums text-muted-foreground text-xs",
    cell: (r) => `${r.freeAfter.toLocaleString("en-US")} / ${r.paidAfter.toLocaleString("en-US")}`,
  },
  {
    header: "Model",
    accessorKey: "modelId",
    className: "text-muted-foreground text-xs",
    cell: (r) => r.modelId ?? "—",
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    className: "text-muted-foreground text-xs",
    cell: (r) => format(new Date(r.createdAt), "d MMM yyyy, HH:mm"),
  },
];
