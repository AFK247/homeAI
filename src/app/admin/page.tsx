import { BarChart3, Boxes, Image as ImageIcon, Store, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PAGES } from "@/config/pages";
import { StatCard } from "./_components/stat-card";
import { AdminService } from "./_modules/admin.service";

/*
 * Admin overview — headline stats, the event breakdown (vendor sales pitch),
 * and the most recent designs.
 */
export default async function AdminOverviewPage() {
  const [stats, breakdown, recent] = await Promise.all([
    AdminService.overview(),
    AdminService.eventBreakdown(),
    AdminService.recentDesigns(6),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Designs" value={stats.designs} icon={ImageIcon} />
        <StatCard label="Sessions" value={stats.sessions} icon={Users} />
        <StatCard label="Furniture" value={stats.furniture} icon={Boxes} />
        <StatCard label="Vendors" value={stats.vendors} icon={Store} />
        <StatCard label="Events" value={stats.events} icon={BarChart3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Event breakdown — the metrics we sell to vendors */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-foreground">Event breakdown</h2>
          {breakdown.length === 0 ? (
            <p className="text-brand-body text-sm">No events yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {breakdown.map((row) => (
                <li key={row.eventType} className="flex items-center justify-between text-sm">
                  <span className="text-brand-body">{row.eventType}</span>
                  <span className="font-bold text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent designs */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Recent designs</h2>
            <Link href={PAGES.ADMIN.DESIGNS} className="font-semibold text-primary text-sm">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recent.map((d) => (
              <div key={d.id} className="overflow-hidden rounded-xl border border-border">
                {d.generatedImageUrl ? (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={d.generatedImageUrl}
                      alt={`${d.style} ${d.roomType}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground text-xs">
                    {d.status}
                  </div>
                )}
                <div className="p-2">
                  <div className="truncate font-semibold text-foreground text-xs">{d.style}</div>
                  <div className="truncate text-muted-foreground text-[11px]">{d.roomType}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
