import { QueryProvider } from "@/providers/query.provider";
import { SessionsList } from "./list";
import { sessionsPromises } from "./promises";

/*
 * Admin — anonymous sessions (no auth yet). Keyed by cookie id; becomes real
 * user accounts once Better Auth lands.
 */
export default function AdminSessionsPage() {
  const promises = sessionsPromises();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Sessions</h1>
      <p className="text-brand-body text-sm">
        No login yet — these are anonymous sessions (cookie id). They become real user accounts once
        auth is wired.
      </p>
      <QueryProvider promises={promises}>
        <SessionsList />
      </QueryProvider>
    </div>
  );
}
