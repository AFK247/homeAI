import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { GenerationsList } from "./list";
import { generationsPromises } from "./promises";
import { GenerationStats } from "./stats";

/*
 * Admin — AI generation logs, backend-paginated. Shows headline KPIs (spend,
 * success rate, avg latency) plus the full per-generation table (provider,
 * model, cost, latency, fallback chain). Row eye-icon → generation detail.
 */
export default async function AdminGenerationsPage({ searchParams }: PageSearchParams) {
  const promises = generationsPromises(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Generations</h1>
      <QueryProvider promises={promises}>
        <GenerationStats />
        <GenerationsList />
      </QueryProvider>
    </div>
  );
}
