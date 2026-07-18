import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminNav } from "./_components/admin-nav";

/*
 * Admin shell — sidebar + content. Wraps every /admin/* page.
 *
 * GUARDED: requires a signed-in user with role="admin". Middleware already bounced
 * cookie-less visitors to login; this is the authoritative role check (DB-backed). A
 * signed-in non-admin is sent home.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if ((user as { role?: string }).role !== "admin") redirect(PAGES.HOME);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-border border-r bg-card px-4 py-5 md:flex">
        <div className="flex items-center gap-2 px-1">
          <Link href={PAGES.HOME}>
            <Logo size="sm" />
          </Link>
          <span className="rounded bg-secondary px-1.5 py-0.5 font-bold text-[10px] text-secondary-foreground uppercase">
            Admin
          </span>
        </div>
        <AdminNav />
      </aside>
      {/* The `flex flex-col gap-6` here is the shared page-content spacing — every
          admin page renders a PageHeader + body into it, so pages no longer repeat
          that wrapper themselves. */}
      <main className="flex flex-1 flex-col gap-6 overflow-x-auto px-6 py-8">{children}</main>
    </div>
  );
}
