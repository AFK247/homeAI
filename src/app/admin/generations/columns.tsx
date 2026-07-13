"use client";

import { format } from "date-fns";
import { Check, Eye, X } from "lucide-react";
import Link from "next/link";
import { PAGES } from "@/config/pages";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import type { GenerationLogRow } from "../_modules/admin.service";

/**
 * Real reported cost only. OpenRouter returns a $ cost; Cloudflare returns none
 * per image (its real usage is aggregated in the provider-page quota card), so
 * Cloudflare rows show "—" — we never show a calculated number as if measured.
 */
function fmtCost(cost: number | null): string {
  if (cost == null || !Number.isFinite(cost)) return "—";
  return `$${cost.toFixed(4)}`;
}

function dims(w: number | null, h: number | null): string {
  return w && h ? `${w}×${h}` : "—";
}

export const columns: DataTableColumn<GenerationLogRow>[] = [
  {
    header: "Status",
    accessorKey: "success",
    cell: (g) =>
      g.success ? (
        <Badge variant="default" className="gap-1">
          <Check className="size-3" /> OK
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <X className="size-3" /> Failed
        </Badge>
      ),
  },
  {
    header: "Provider",
    accessorKey: "provider",
    cell: (g) => g.provider ?? "—",
  },
  {
    header: "Model",
    accessorKey: "model",
    className: "font-mono text-xs",
    cell: (g) => g.model ?? "—",
  },
  { header: "Room", accessorKey: "roomType" },
  { header: "Style", accessorKey: "style" },
  {
    header: "Size (in → out)",
    accessorKey: "outputWidth",
    className: "text-xs tabular-nums",
    cell: (g) => {
      if (!g.outputWidth || !g.outputHeight) return <span className="text-muted-foreground">—</span>;
      const mp = ((g.outputWidth * g.outputHeight) / 1_000_000).toFixed(1);
      return (
        <span className="whitespace-nowrap">
          <span className="text-muted-foreground">{dims(g.inputWidth, g.inputHeight)}</span>
          <span className="mx-1 text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{dims(g.outputWidth, g.outputHeight)}</span>
          <span className="ml-1 text-muted-foreground">({mp}MP)</span>
        </span>
      );
    },
  },
  {
    header: "Cost",
    accessorKey: "costUsd",
    sortable: true,
    className: "text-right tabular-nums",
    cell: (g) => fmtCost(g.costUsd),
  },
  {
    header: "Latency",
    accessorKey: "latencyMs",
    sortable: true,
    className: "text-right tabular-nums text-muted-foreground",
    cell: (g) => (g.latencyMs != null ? `${(g.latencyMs / 1000).toFixed(1)}s` : "—"),
  },
  {
    header: "Fallback",
    accessorKey: "providersTried",
    className: "text-muted-foreground text-xs",
    cell: (g) => (g.providersTried?.length ? g.providersTried.join(" → ") : "—"),
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    className: "text-muted-foreground text-xs",
    cell: (g) => format(new Date(g.createdAt), "d MMM, HH:mm"),
  },
  {
    header: "",
    accessorKey: "id",
    className: "w-10 text-right",
    cell: (g) => (
      <Link
        href={PAGES.ADMIN.GENERATION_DETAIL(g.id)}
        aria-label="View generation"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Eye className="size-4" />
      </Link>
    ),
  },
];
