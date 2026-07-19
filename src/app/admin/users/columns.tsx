"use client";

import { format } from "date-fns";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { UserUsageRow } from "@/server/service/admin-billing/admin-billing.service";

/** Type badge → variant + label. Paid stands out (default/green); anon is muted. */
const TYPE_META: Record<
  UserUsageRow["type"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  paid: { label: "Paid", variant: "default" },
  free: { label: "Free", variant: "secondary" },
  registered: { label: "Registered", variant: "outline" },
  anonymous: { label: "Anonymous", variant: "outline" },
};

const num = (n: number) => n.toLocaleString("en-US");
const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

/** Plain-English description of what a balance is made of — no "free / paid" notation. */
function balanceMakeup(free: number, paid: number): string {
  if (free === 0 && paid === 0) return "empty";
  if (paid === 0) return "all free";
  if (free === 0) return "all paid";
  return `${num(free)} free + ${num(paid)} paid`;
}

export const columns: DataTableColumn<UserUsageRow>[] = [
  {
    header: "User",
    accessorKey: "email",
    className: "text-foreground",
    // Users show name/email; anonymous sessions show a shortened anon id + a hint.
    cell: (r) =>
      r.userId ? (
        <div className="flex flex-col">
          <span className="font-medium">{r.name ?? "—"}</span>
          <span className="text-muted-foreground text-xs">{r.email}</span>
        </div>
      ) : (
        <div className="flex flex-col">
          <span className="text-foreground">Guest</span>
          <span className="font-mono text-muted-foreground text-xs">
            {r.anonymousId ? `${r.anonymousId.slice(0, 10)}…` : "—"}
          </span>
        </div>
      ),
  },
  {
    header: "Type",
    accessorKey: "type",
    cell: (r) => {
      const m = TYPE_META[r.type];
      return <Badge variant={m.variant}>{m.label}</Badge>;
    },
  },
  {
    header: "Credits left",
    accessorKey: "paidBalance",
    sortable: true,
    className: "text-foreground",
    // One clear number + a plain-words breakdown underneath.
    cell: (r) => {
      const total = r.freeBalance + r.paidBalance;
      return (
        <div className="flex flex-col">
          <span className="font-medium tabular-nums">{num(total)}</span>
          <span className="text-muted-foreground text-xs">
            {balanceMakeup(r.freeBalance, r.paidBalance)}
          </span>
        </div>
      );
    },
  },
  {
    header: "Credits used",
    accessorKey: "consumed",
    sortable: true,
    className: "text-foreground",
    cell: (r) => (
      <div className="flex flex-col">
        <span className="font-medium tabular-nums">{num(r.consumed)}</span>
        <span className="text-muted-foreground text-xs">
          {r.consumed > 0 ? "on designs" : "none yet"}
        </span>
      </div>
    ),
  },
  {
    header: "Total spent",
    accessorKey: "spentBdt",
    sortable: true,
    className: "tabular-nums text-foreground",
    // Money paid (successful payments). Dash when they've never bought.
    cell: (r) => (r.spentBdt > 0 ? taka(Math.round(r.spentBdt)) : "—"),
  },
  {
    header: "Last active",
    accessorKey: "lastActive",
    className: "text-muted-foreground text-xs",
    cell: (r) => format(new Date(r.lastActive), "d MMM yyyy"),
  },
];
