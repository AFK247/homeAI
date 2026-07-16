import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Shared page header for admin/list screens (reference convention: one PageHeader
 * used everywhere, so every table page has the exact same title/description/actions
 * layout). Server-safe (no hooks) — renders in a server component.
 *
 *   <PageHeader title="Vendors" />
 *   <PageHeader title="Furniture" actions={<Button>New item</Button>} />
 *   <PageHeader title="Sessions" description="Anonymous sessions…" />
 */
export function PageHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  /** Optional sub-line under the title. */
  description?: ReactNode;
  /** Optional right-aligned controls (e.g. a "New item" button, a clear-filter link). */
  actions?: ReactNode;
  /** Optional leading icon badge (e.g. a section glyph on dashboard-style pages). */
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            {icon}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif font-extrabold text-3xl text-foreground">{title}</h1>
          {description ? <p className="text-brand-body text-sm">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
