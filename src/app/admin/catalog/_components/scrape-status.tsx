import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/*
 * Shared scrape-status presentation for the catalog tool. One source of truth for how a run's
 * state maps to a label/variant/emoji, used by both the overview cards (per-vendor badges) and the
 * per-vendor page. Keeps "who is scraping" reading identically everywhere.
 */

export type ScrapeJobLike = {
  status: string;
  totalUrls: number;
  doneUrls: number;
  failedUrls: number;
} | null;

interface StatusMeta {
  label: string;
  emoji: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

/** Map (running, job) → a badge label + variant. `running` = live in this process right now. */
export function statusMeta(running: boolean, job: ScrapeJobLike): StatusMeta {
  if (running) {
    const progress = job && job.totalUrls > 0 ? ` ${job.doneUrls}/${job.totalUrls}` : "…";
    return { label: `Scraping${progress}`, emoji: "⏳", variant: "secondary" };
  }
  if (!job) return { label: "Not scraped", emoji: "—", variant: "outline" };
  if (job.status === "done") return { label: "Done", emoji: "✓", variant: "default" };
  if (job.status === "cancelled") return { label: "Stopped", emoji: "◼", variant: "outline" };
  if (job.status === "interrupted")
    return { label: "Interrupted", emoji: "⚠", variant: "destructive" };
  return { label: job.status, emoji: "•", variant: "secondary" };
}

/** A compact live status badge for a vendor (running spinner + label). */
export function ScrapeStatusBadge({ running, job }: { running: boolean; job: ScrapeJobLike }) {
  const m = statusMeta(running, job);
  return (
    <Badge variant={m.variant} className="gap-1">
      {running ? <Loader2 className="size-3 animate-spin" /> : <span>{m.emoji}</span>}
      {m.label}
    </Badge>
  );
}
