import { Clock, Cpu, ImageIcon, TrendingUp } from "lucide-react";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { serverRpc } from "@/server/rpc/server";

/* Headline generation KPIs — server component; scoped to the SAME filters as the table so
 * the cards reflect the currently-filtered rows. */
export async function GenerationStats({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, {
    filterKeys: ["provider", "style", "roomType", "session", "designId"],
  });
  const stats = await serverRpc.generation.stats(params);
  const successRate = stats.total ? Math.round((stats.succeeded / stats.total) * 100) : 0;

  const cards = [
    {
      // Cloudflare bills in Neurons (not $), so the meaningful total is neurons spent.
      label: "Total neurons",
      value: Math.round(stats.totalNeurons).toLocaleString("en-US"),
      icon: Cpu,
    },
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
