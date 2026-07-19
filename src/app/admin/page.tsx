import {
  BarChart3,
  Boxes,
  Coins,
  CreditCard,
  Image as ImageIcon,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PAGES } from "@/config/pages";
import { serverRpc } from "@/server/rpc/server";
import { StatCard } from "./_components/stat-card";
import { AdminService } from "./_modules/admin.service";

/*
 * Admin overview — headline stats, billing snapshot (revenue + segments), the event breakdown
 * (vendor sales pitch), and the most recent designs.
 */
export default async function AdminOverviewPage() {
  const [stats, breakdown, recent, revenue, segments] = await Promise.all([
    AdminService.overview(),
    serverRpc.event.countsByType(),
    AdminService.recentDesigns(6),
    serverRpc.adminBilling.revenueSummary(),
    serverRpc.adminBilling.segments(),
  ]);

  const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
  const num = (n: number) => n.toLocaleString("en-US");

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

      {/* Billing snapshot — revenue + consumption + who's using credits */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Billing</h2>
          <Link href={PAGES.ADMIN.PAYMENTS} className="font-semibold text-primary text-sm">
            View payments →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Revenue" value={taka(revenue.revenueBdt)} icon={TrendingUp} />
          <StatCard label="Paying users" value={num(revenue.payingUsers)} icon={CreditCard} />
          <StatCard label="Credits sold" value={num(revenue.creditsSold)} icon={Coins} />
          <StatCard label="Credits consumed" value={num(revenue.creditsConsumed)} icon={Coins} />
        </div>

        {/* User segments */}
        <div className="grid gap-4 sm:grid-cols-3">
          <SegmentCard
            label="Anonymous"
            count={segments.anonCount}
            consumed={segments.anonConsumed}
          />
          <SegmentCard label="Free" count={segments.freeCount} consumed={segments.freeConsumed} />
          <SegmentCard label="Paid" count={segments.paidCount} consumed={segments.paidConsumed} />
        </div>
      </section>

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

/** One user-segment card: how many owners in the cohort + credits they've consumed. */
function SegmentCard({
  label,
  count,
  consumed,
}: {
  label: string;
  count: number;
  consumed: number;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="text-brand-body text-sm">{label}</div>
      <div className="mt-1 font-serif font-extrabold text-2xl text-foreground">
        {count.toLocaleString("en-US")}
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        {consumed.toLocaleString("en-US")} credits used
      </div>
    </div>
  );
}
