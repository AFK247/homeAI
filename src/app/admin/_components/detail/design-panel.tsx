import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Design, DesignTag } from "@/db/types";
import { formatDateTime } from "@/lib/date";

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

function Figure({
  src,
  label,
  caption,
  tags,
}: {
  src: string;
  label: string;
  /** Sub-caption under the title, e.g. a pin count. */
  caption?: string;
  /** Furniture pins to overlay (numbered dots) — the "with tags" variant. */
  tags?: DesignTag[];
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          src={src}
          alt={label}
          fill
          sizes="(max-width: 640px) 50vw, 220px"
          className="object-cover"
        />
        {tags?.map((t, i) => (
          <span
            key={t.id}
            className="-translate-x-1/2 -translate-y-1/2 absolute flex size-5 items-center justify-center rounded-full border-2 border-white bg-primary font-bold text-[10px] text-primary-foreground shadow"
            style={{ left: `${t.xCoord * 100}%`, top: `${t.yCoord * 100}%` }}
            title={t.label ?? undefined}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <figcaption className="text-center text-brand-body text-xs">
        {label}
        {caption ? (
          <span className="block text-[11px] text-muted-foreground">{caption}</span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/*
 * Shared design-info panel — reused by the design detail page and (as the parent
 * design) the generation detail page. Three images on top (original, redesigned,
 * redesigned-with-furniture-pins), metadata below.
 */
export function DesignPanel({ design, tags = [] }: { design: Design; tags?: DesignTag[] }) {
  const pinCount = tags.length;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-border border-b px-5 py-4">
        <h2 className="font-bold text-foreground text-lg">Design</h2>
        <Badge variant={STATUS_VARIANT[design.status] ?? "secondary"}>{design.status}</Badge>
      </div>

      <div className="p-5">
        {/* Original → Redesigned → Redesigned with furniture pins. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {design.originalImageUrl ? (
            <Figure src={design.originalImageUrl} label="① Original" caption="The uploaded room" />
          ) : (
            <EmptyFigure label="① Original" />
          )}
          {design.generatedImageUrl ? (
            <Figure src={design.generatedImageUrl} label="② Redesigned" caption="AI result" />
          ) : (
            <EmptyFigure label="② Redesigned" />
          )}
          {design.generatedImageUrl ? (
            <Figure
              src={design.generatedImageUrl}
              label="③ With furniture tags"
              caption={pinCount ? `${pinCount} pin${pinCount === 1 ? "" : "s"}` : "No pins yet"}
              tags={tags}
            />
          ) : (
            <EmptyFigure label="③ With furniture tags" />
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
                {design.anonymousId
                  ? `${design.anonymousId.slice(0, 10)}…`
                  : (design.userId ?? "—")}
              </span>
            }
          />
          <Field
            label="Created"
            value={formatDateTime(design.createdAt, { preset: "datetimeYear" })}
          />
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
