import { format } from "date-fns";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Design } from "@/db/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  done: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-brand-body text-xs uppercase tracking-wide">{label}</dt>
      <dd className="font-medium text-foreground text-sm">{value}</dd>
    </div>
  );
}

function Figure({ src, label }: { src: string; label: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Image src={src} alt={label} fill sizes="(max-width: 640px) 50vw, 220px" className="object-cover" />
      </div>
      <figcaption className="text-center text-brand-body text-xs">{label}</figcaption>
    </figure>
  );
}

/*
 * Shared design-info panel — reused by the design detail page and (as the parent
 * design) the generation detail page. Before/after images on top, metadata below.
 */
export function DesignPanel({ design }: { design: Design }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-border border-b px-5 py-4">
        <h2 className="font-bold text-foreground text-lg">Design</h2>
        <Badge variant={STATUS_VARIANT[design.status] ?? "secondary"}>{design.status}</Badge>
      </div>

      <div className="p-5">
        {/* Before / after images — capped width so they stay a preview, not huge. */}
        <div className="grid max-w-md grid-cols-2 gap-4">
          {design.originalImageUrl ? (
            <Figure src={design.originalImageUrl} label="Original" />
          ) : (
            <EmptyFigure label="Original" />
          )}
          {design.generatedImageUrl ? (
            <Figure src={design.generatedImageUrl} label="Redesigned" />
          ) : (
            <EmptyFigure label="Redesigned" />
          )}
        </div>

        {/* Metadata */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-border border-t pt-5 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Room" value={design.roomType} />
          <Field label="Style" value={design.style} />
          <Field label="Panorama" value={design.isPanorama ? "Yes" : "No"} />
          <Field label="AI provider" value={design.aiProvider ?? "—"} />
          <Field
            label="AI model"
            value={<span className="break-all font-mono text-xs">{design.aiModel ?? "—"}</span>}
          />
          <Field label="Saved" value={design.isSaved ? "Yes" : "No"} />
          <Field
            label="Session"
            value={
              <span className="font-mono text-muted-foreground text-xs">
                {design.anonymousId ? `${design.anonymousId.slice(0, 10)}…` : (design.userId ?? "—")}
              </span>
            }
          />
          <Field label="Created" value={format(new Date(design.createdAt), "d MMM yyyy, HH:mm")} />
        </dl>

        {design.prompt && (
          <div className="mt-5 rounded-xl bg-muted/50 p-4">
            <dt className="mb-1 text-brand-body text-xs uppercase tracking-wide">User prompt</dt>
            <dd className="text-foreground text-sm leading-relaxed">{design.prompt}</dd>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyFigure({ label }: { label: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-border border-dashed bg-muted text-muted-foreground text-sm">
        No image
      </div>
      <figcaption className="text-center text-brand-body text-xs">{label}</figcaption>
    </figure>
  );
}
