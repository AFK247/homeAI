"use client";

import { format } from "date-fns";
import { Check, Eye, X } from "lucide-react";
import Link from "next/link";
import type { DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/config/pages";
import type { GenerationLogRow } from "./_modules/generation.router";

/**
 * Cost per generation — the REAL figure recorded at generation time. Cloudflare rows
 * show the actual Neurons consumed (image-gen + tagging summed, from the cf-ai-neurons
 * header); OpenRouter rows show its reported $. "—" when neither was reported.
 */
function fmtCost(row: GenerationLogRow): string {
  if (row.neurons != null && Number.isFinite(row.neurons)) return `${Math.round(row.neurons)} N`;
  if (row.costUsd != null && Number.isFinite(row.costUsd)) return `$${row.costUsd.toFixed(4)}`;
  return "—";
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
    header: "Prompt",
    accessorKey: "prompt",
    // Truncated preview; full prompt on hover (native title) + on the detail page.
    cell: (g) =>
      g.prompt ? (
        <span
          title={g.prompt}
          className="block max-w-[16rem] cursor-help truncate text-muted-foreground text-xs"
        >
          {g.prompt}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      ),
  },
  {
    header: "Size (in → out)",
    accessorKey: "outputWidth",
    className: "text-xs tabular-nums",
    cell: (g) => {
      if (!g.outputWidth || !g.outputHeight)
        return <span className="text-muted-foreground">—</span>;
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
    // Real Neurons for Cloudflare (image-gen + tagging summed), $ for OpenRouter.
    cell: (g) => fmtCost(g),
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
