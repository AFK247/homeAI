import { Coins, Image as ImageIcon, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PAGES } from "@/config/pages";
import { serverRpc } from "@/server/rpc/server";
import {
  DesignsOverTimeChart,
  EngagementChart,
  GenerationSuccessChart,
  StylesChart,
} from "./_components/overview-charts";
import { StatCard } from "./_components/stat-card";
import { AdminService } from "./_modules/admin.service";

/*
 * Admin overview — four headline numbers, then a grid of charts (activity trend, engagement
 * funnel, popular styles, generation health) and a recent-designs strip. Deeper drill-downs live
 * on their own pages, one click away.
 */
export default async function AdminOverviewPage() {
  const [stats, breakdown, recent, revenue, segments, overTime, styles, genSuccess] =
    await Promise.all([
      AdminService.overview(),
      serverRpc.event.countsByType(),
      AdminService.recentDesigns(6),
      serverRpc.adminBilling.revenueSummary(),
      serverRpc.adminBilling.segments(),
      AdminService.designsOverTime(14),
      AdminService.stylesBreakdown(),
      AdminService.generationSuccess(),
    ]);

  const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;
  const totalUsers = segments.anonCount + segments.freeCount + segments.paidCount;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif font-extrabold text-3xl text-foreground">Overview</h1>

      {/* The four numbers that matter at a glance. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Designs created" value={stats.designs} icon={ImageIcon} />
        <StatCard label="Users" value={totalUsers} icon={Users} />
        <StatCard label="Revenue" value={taka(revenue.revenueBdt)} icon={TrendingUp} />
        <StatCard label="Credits used" value={revenue.creditsConsumed} icon={Coins} />
      </div>

      {/* Charts — activity trend (wide) + generation health, then engagement + styles. */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <DesignsOverTimeChart data={overTime} />
        <GenerationSuccessChart data={genSuccess} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementChart data={breakdown} />
        <StylesChart data={styles} />
      </div>

      {/* Recent designs — the product working. */}
      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-foreground">Recent designs</h2>
          <Link href={PAGES.ADMIN.DESIGNS} className="font-semibold text-primary text-sm">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
  );
}
