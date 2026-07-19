import { Check, ImageOff, X } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { GenerationLog } from "@/db/types";
import { formatDateTime } from "@/lib/date";

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

      <div className="flex flex-col gap-5 md:flex-row">
        {/* This attempt's own output image (null on failed attempts). */}
        <div className="w-full shrink-0 md:w-[220px]">
          {log.imageUrl ? (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={log.imageUrl}
                alt="Generated result"
                fill
                sizes="(max-width: 768px) 100vw, 220px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-border border-dashed bg-muted text-muted-foreground">
              <ImageOff className="size-6" />
              <span className="px-2 text-center text-xs">
                {log.success ? "Image not stored" : "Failed — no image"}
              </span>
            </div>
          )}
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
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
          <Field
            label="Created"
            value={formatDateTime(log.createdAt, { preset: "datetimeYear" })}
          />
        </dl>
      </div>

      {log.prompt && (
        <div className="mt-4 border-border border-t pt-3">
          <dt className="mb-1 text-brand-body text-xs">Prompt sent to the model</dt>
          <dd className="whitespace-pre-wrap text-foreground text-sm">{log.prompt}</dd>
        </div>
      )}

      {log.errorMessage && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <dt className="text-brand-body text-xs">Error</dt>
          <dd className="font-mono text-destructive text-xs">{log.errorMessage}</dd>
        </div>
      )}
    </section>
  );
}
