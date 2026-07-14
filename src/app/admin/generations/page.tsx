import { PAGES } from "@/config/pages";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { GenerationsList } from "./list";
import { generationsPromises } from "./promises";
import { GenerationStats } from "./stats";

/*
 * Admin — AI generation logs, backend-paginated. Shows headline KPIs (spend,
 * success rate, avg latency) plus the full per-generation table. Row eye-icon →
 * generation detail. Supports ?session= and ?designId= to drill in from the
 * Sessions / Designs pages.
 */
export default async function AdminGenerationsPage({ searchParams }: PageSearchParams) {
  const raw = await searchParams;
  const promises = generationsPromises(raw);
  const session = typeof raw.session === "string" ? raw.session : null;
  const designId = typeof raw.designId === "string" ? raw.designId : null;
  const filter = session
    ? { label: "session", value: session }
    : designId
      ? { label: "design", value: designId }
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Generations</h1>
        {filter && (
          <a
            href={PAGES.ADMIN.GENERATIONS}
            className="rounded-md border border-border px-3 py-1.5 font-medium text-sm hover:bg-muted"
          >
            ✕ Clear {filter.label} filter
          </a>
        )}
      </div>
      {filter && (
        <p className="text-brand-body text-sm">
          Showing generations for {filter.label}{" "}
          <code className="font-mono text-xs">{filter.value}</code>
        </p>
      )}
      <QueryProvider promises={promises}>
        <GenerationStats />
        <GenerationsList />
      </QueryProvider>
    </div>
  );
}
