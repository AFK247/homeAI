"use client";

import { Check, X } from "lucide-react";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { ModelUsage } from "@/server/service/ai/providers/status";
import type { QuotaResult } from "@/server/service/ai/providers/types";

export interface ProviderRow {
  order: number;
  key: string;
  label: string;
  model: string;
  ready: boolean;
  /** What the provider does — image generation, furniture tagging, or category mapping. */
  kind: "Image" | "Tagging" | "Category";
  /** Display string for remaining balance/quota, e.g. "$4.60". */
  balance: string;
  /** Numeric USD remaining, or null (used to colour low balances). */
  balanceRemaining: number | null;
  /** Free-tier quota, when the provider reports one; null otherwise. */
  quota: QuotaResult | null;
  /** Total successful images this provider has generated. */
  generationCount: number;
  /** Real avg Neurons + $/call from Cloudflare analytics; null for others. */
  usage: ModelUsage | null;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export const columns: DataTableColumn<ProviderRow>[] = [
  { header: "Order", accessorKey: "order", className: "w-16" },
  { header: "Provider", accessorKey: "label" },
  {
    header: "Type",
    accessorKey: "kind",
    cell: (p) => (
      <Badge variant="secondary" className="font-normal">
        {p.kind}
      </Badge>
    ),
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
    // Total Neurons this model has spent (all history Cloudflare retains, ~31 days).
    header: "Total neurons",
    accessorKey: "usage",
    id: "usageTotal",
    className: "text-right tabular-nums",
    cell: (p) =>
      p.usage ? (
        <span className="font-semibold text-foreground">{fmt(p.usage.neurons)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    // Total API calls to this model (Cloudflare-level).
    header: "Calls",
    accessorKey: "usage",
    id: "usageCalls",
    className: "text-right tabular-nums",
    cell: (p) =>
      p.usage ? (
        <span className="text-foreground">{p.usage.calls.toLocaleString("en-US")}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    // Average Neurons per single call.
    header: "Avg / call",
    accessorKey: "usage",
    id: "usageAvg",
    className: "text-right tabular-nums",
    cell: (p) =>
      p.usage ? (
        <span className="text-muted-foreground">~{fmt(p.usage.avgNeuronsPerCall)} N</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  // Balance + Daily quota columns are intentionally omitted here — they're already shown
  // in the cards above the table, so repeating them in the row is redundant.
];
