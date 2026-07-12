import { format } from "date-fns";
import { AdminService } from "../_modules/admin.service";

/*
 * Admin — event log + breakdown. These product events (generation, tag_click,
 * buy_click, share, save) are the metrics sold to vendors (PROJECT_CONTEXT §14).
 */
export default async function AdminEventsPage() {
  const [breakdown, recent] = await Promise.all([
    AdminService.eventBreakdown(),
    AdminService.recentEvents(50),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Events</h1>

      <div className="flex flex-wrap gap-3">
        {breakdown.map((b) => (
          <div
            key={b.eventType}
            className="flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 shadow-sm"
          >
            <span className="font-bold text-foreground text-lg">{b.count}</span>
            <span className="text-brand-body text-sm">{b.eventType}</span>
          </div>
        ))}
        {breakdown.length === 0 ? <p className="text-brand-body text-sm">No events yet.</p> : null}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Session</th>
              <th className="px-4 py-3 font-semibold">Metadata</th>
              <th className="px-4 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((e) => (
              <tr key={e.id} className="border-border border-b last:border-0">
                <td className="px-4 py-2.5 font-semibold text-foreground">{e.eventType}</td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground text-xs">
                  {e.anonymousId ? `${e.anonymousId.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-muted-foreground text-xs">
                  {e.metadata ? JSON.stringify(e.metadata) : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">
                  {format(new Date(e.createdAt), "d MMM, HH:mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
