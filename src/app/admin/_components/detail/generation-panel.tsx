import { format } from "date-fns";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { GenerationLog } from "@/db/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-brand-body text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-sm tabular-nums">{value}</dd>
    </div>
  );
}

function dims(w: number | null, h: number | null, withMp = false): string {
  if (!w || !h) return "—";
  const base = `${w}×${h}`;
  return withMp ? `${base} · ${((w * h) / 1_000_000).toFixed(2)}MP` : base;
}

/** Real reported cost only — Cloudflare returns none per image, so it shows "—". */
function fmtCost(log: GenerationLog): string {
  return log.costUsd != null ? `$${Number(log.costUsd).toFixed(4)}` : "—";
}

/*
 * Shared generation-attempt panel — reused by the generation detail page (as
 * the primary subject) and the design detail page (one per attempt in a list).
 */
export function GenerationPanel({ log }: { log: GenerationLog }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-foreground">Generation attempt</h2>
        {log.success ? (
          <Badge variant="default" className="gap-1">
            <Check className="size-3" /> Success
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <X className="size-3" /> Failed
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
        <Field label="Provider" value={log.provider ?? "—"} />
        <Field
          label="Model"
          value={<span className="font-mono text-xs">{log.model ?? "—"}</span>}
        />
        <Field label="Cost" value={fmtCost(log)} />
        <Field
          label="Latency"
          value={log.latencyMs != null ? `${(log.latencyMs / 1000).toFixed(1)}s` : "—"}
        />
        <Field label="Input size" value={dims(log.inputWidth, log.inputHeight)} />
        <Field label="Output size" value={dims(log.outputWidth, log.outputHeight, true)} />
        <Field label="Room" value={log.roomType} />
        <Field label="Style" value={log.style} />
        <Field label="Has prompt" value={log.hasUserPrompt ? "Yes" : "No"} />
        <Field
          label="Fallback chain"
          value={log.providersTried?.length ? log.providersTried.join(" → ") : "—"}
        />
        <Field label="Created" value={format(new Date(log.createdAt), "d MMM yyyy, HH:mm")} />
      </dl>

      {log.errorMessage && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <dt className="text-brand-body text-xs">Error</dt>
          <dd className="font-mono text-destructive text-xs">{log.errorMessage}</dd>
        </div>
      )}
    </section>
  );
}
