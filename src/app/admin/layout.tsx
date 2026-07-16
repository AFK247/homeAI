import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { AdminNav } from "./_components/admin-nav";

/*
 * Admin shell — sidebar + content. Wraps every /admin/* page.
 *
 * NOTE: unprotected for now (no auth). Gate behind admin auth (withRole('admin'))
 * once Better Auth lands.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
