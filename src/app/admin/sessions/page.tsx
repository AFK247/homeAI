import { format } from "date-fns";
import { AdminService } from "../_modules/admin.service";

/*
 * Admin — anonymous sessions. Since auth isn't wired, "users" are anonymous
 * sessions keyed by their cookie id. Shows designs per session + last activity.
 * This becomes real user accounts once Better Auth lands.
 */
export default async function AdminSessionsPage() {
  const sessions = await AdminService.sessions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">Sessions</h1>
        <span className="text-brand-body text-sm">{sessions.length} anonymous</span>
      </div>
      <p className="text-brand-body text-sm">
        No login yet — these are anonymous sessions (cookie id). They become real user accounts once
        auth is wired.
      </p>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-border border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Session (anon id)</th>
              <th className="px-4 py-3 font-semibold">Designs</th>
              <th className="px-4 py-3 font-semibold">Last active</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.anonymousId ?? "none"} className="border-border border-b last:border-0">
                <td className="px-4 py-3 font-mono text-foreground text-xs">
                  {s.anonymousId ?? "—"}
                </td>
                <td className="px-4 py-3 font-bold text-foreground">{s.designCount}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {format(new Date(s.lastActive), "d MMM yyyy, HH:mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
