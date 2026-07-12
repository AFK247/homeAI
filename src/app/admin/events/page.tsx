import type { PageSearchParams } from "@/db/helpers/search-params";
import { QueryProvider } from "@/providers/query.provider";
import { EventsList } from "./list";
import { eventsPromises } from "./promises";

/*
 * Admin — event log + breakdown. Product events (generation, tag_click,
 * buy_click, share, save) are the vendor sales-pitch metrics (§14).
 */
export default async function AdminEventsPage({ searchParams }: PageSearchParams) {
  const promises = eventsPromises(await searchParams);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Events</h1>
      <QueryProvider promises={promises}>
        <EventsList />
      </QueryProvider>
    </div>
  );
}
