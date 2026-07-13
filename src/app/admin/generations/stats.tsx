"use client";

import { CircleDollarSign, Clock, ImageIcon, TrendingUp } from "lucide-react";
import { useDataProvider } from "@/providers/data.provider";
import type { GenerationsPageData } from "./promises";

/* Headline generation KPIs, read from the DataProvider (stats promise). */
export function GenerationStats() {
  const { stats } = useDataProvider<GenerationsPageData>();
  const successRate = stats.total ? Math.round((stats.succeeded / stats.total) * 100) : 0;

  const cards = [
    { label: "Total spend", value: `$${stats.totalCostUsd.toFixed(2)}`, icon: CircleDollarSign },
    { label: "Generations", value: String(stats.total), icon: ImageIcon },
    { label: "Success rate", value: `${successRate}%`, icon: TrendingUp },
    { label: "Avg latency", value: `${(stats.avgLatencyMs / 1000).toFixed(1)}s`, icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-brand-body text-sm">
            <c.icon className="size-4" />
            {c.label}
          </div>
          <div className="mt-1 font-bold text-2xl text-foreground tabular-nums">{c.value}</div>
        </div>
      ))}
    </div>
  );
}
