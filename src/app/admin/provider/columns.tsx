"use client";

import { Check, X } from "lucide-react";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { DailyQuota } from "@/server/service/ai/providers/cloudflare-analytics";

export interface ProviderRow {
  order: number;
  key: string;
  label: string;
  model: string;
  ready: boolean;
  /** Display string for remaining balance/quota, e.g. "$4.60". */
  balance: string;
  /** Numeric USD remaining, or null (used to colour low balances). */
  balanceRemaining: number | null;
  /** Cloudflare's real daily free-neuron quota; null for other providers. */
  quota: DailyQuota | null;
  /** Total successful images this provider has generated. */
  generationCount: number;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export const columns: DataTableColumn<ProviderRow>[] = [
  { header: "Order", accessorKey: "order", className: "w-16" },
  { header: "Provider", accessorKey: "label" },
  {
    header: "Model",
    accessorKey: "model",
    cell: (p) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.model}</code>,
  },
  {
    header: "Configured",
    accessorKey: "ready",
    cell: (p) =>
      p.ready ? (
        <Badge variant="default" className="gap-1">
          <Check className="size-3" /> Ready
        </Badge>
      ) : (
        <Badge variant="secondary" className="gap-1">
          <X className="size-3" /> Not configured
        </Badge>
      ),
  },
  {
    header: "Generated",
    accessorKey: "generationCount",
    className: "text-right tabular-nums",
    cell: (p) => (
      <span className="font-semibold text-foreground">
        {p.generationCount.toLocaleString("en-US")}
      </span>
    ),
  },
  {
    header: "Balance",
    accessorKey: "balance",
    className: "tabular-nums",
    cell: (p) => {
      const low = p.balanceRemaining != null && p.balanceRemaining < 5;
      const veryLow = p.balanceRemaining != null && p.balanceRemaining < 1;
      return (
        <span
          className={`font-semibold ${
            veryLow ? "text-destructive" : low ? "text-amber-600 dark:text-amber-500" : "text-foreground"
          }`}
        >
          {p.balance}
        </span>
      );
    },
  },
  {
    header: "Daily quota left",
    accessorKey: "quota",
    className: "tabular-nums",
    // Cloudflare's REAL remaining free-neuron quota (from analytics). Amber ≥70%
    // used, red ≥90%. Other providers show "—".
    cell: (p) => {
      const q = p.quota;
      if (!q) return <span className="text-muted-foreground text-xs">—</span>;
      const color =
        q.usedPct >= 90
          ? "text-destructive"
          : q.usedPct >= 70
            ? "text-amber-600 dark:text-amber-500"
            : "text-foreground";
      return (
        <span className={`font-semibold ${color}`}>
          {fmt(q.left)} <span className="font-normal text-muted-foreground">/ {fmt(q.total)}</span>
        </span>
      );
    },
  },
];
