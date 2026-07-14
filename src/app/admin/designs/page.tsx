import { PAGES } from "@/config/pages";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { DesignsList } from "./list";
import { designsPromises } from "./promises";

/*
 * Admin — all designs, backend-paginated. Builds promises from the URL
 * searchParams → QueryProvider awaits → DesignsList reads via useDataProvider.
 * Supports ?session=<anonId> to drill in from the Sessions page.
 */
export default async function AdminDesignsPage({ searchParams }: PageSearchParams) {
  const raw = await searchParams;
  const promises = designsPromises(raw);
  const session = typeof raw.session === "string" ? raw.session : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Designs</h1>
        {session && (
          <a
            href={PAGES.ADMIN.DESIGNS}
            className="rounded-md border border-border px-3 py-1.5 font-medium text-sm hover:bg-muted"
          >
            ✕ Clear session filter
          </a>
        )}
      </div>
      {session && (
        <p className="text-brand-body text-sm">
          Showing designs for session <code className="font-mono text-xs">{session}</code>
        </p>
      )}
      <QueryProvider promises={promises}>
        <DesignsList />
      </QueryProvider>
    </div>
  );
}
