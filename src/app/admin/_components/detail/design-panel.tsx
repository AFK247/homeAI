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
    <div>
      <dt className="text-brand-body text-xs">{label}</dt>
      <dd className="font-medium text-foreground text-sm">{value}</dd>
    </div>
  );
}

/*
 * Shared design-info panel — reused by both the design detail page (as the
 * primary subject) and the generation detail page (as the parent design).
 */
export function DesignPanel({ design }: { design: Design }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-foreground">Design</h2>
        <Badge variant={STATUS_VARIANT[design.status] ?? "secondary"}>{design.status}</Badge>
      </div>

      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex gap-3">
          {design.originalImageUrl && (
            <figure className="flex flex-col gap-1">
              <Image
                src={design.originalImageUrl}
                alt="Original room"
                width={180}
                height={135}
                className="rounded-lg border border-border object-cover"
              />
              <figcaption className="text-brand-body text-xs">Original</figcaption>
            </figure>
          )}
          {design.generatedImageUrl && (
            <figure className="flex flex-col gap-1">
              <Image
                src={design.generatedImageUrl}
                alt="Redesigned"
                width={180}
                height={135}
                className="rounded-lg border border-border object-cover"
              />
              <figcaption className="text-brand-body text-xs">Redesigned</figcaption>
            </figure>
          )}
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Room" value={design.roomType} />
          <Field label="Style" value={design.style} />
          <Field label="AI provider" value={design.aiProvider ?? "—"} />
          <Field
            label="AI model"
            value={<span className="font-mono text-xs">{design.aiModel ?? "—"}</span>}
          />
          <Field label="Panorama" value={design.isPanorama ? "Yes" : "No"} />
          <Field label="Saved" value={design.isSaved ? "Yes" : "No"} />
          <Field
            label="Session"
            value={
              <span className="font-mono text-muted-foreground text-xs">
                {design.anonymousId ? `${design.anonymousId.slice(0, 12)}…` : (design.userId ?? "—")}
              </span>
            }
          />
          <Field label="Created" value={format(new Date(design.createdAt), "d MMM yyyy, HH:mm")} />
        </dl>
      </div>

      {design.prompt && (
        <div className="mt-4 border-border border-t pt-3">
          <dt className="text-brand-body text-xs">User prompt</dt>
          <dd className="text-foreground text-sm">{design.prompt}</dd>
        </div>
      )}
    </section>
  );
}
