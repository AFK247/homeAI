import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Top site header (design). Shown on every page. Language toggle is visual-only
 * until i18n wiring. `rightSlot` lets a page inject extra controls (e.g. the
 * result page's CreditBadge) alongside the standard login/lang controls.
 */
export function SiteHeader({
  showNav = true,
  rightSlot,
}: {
  showNav?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-border border-b bg-card px-5 py-4 md:px-11">
      <Link href="/">
        <Logo size="md" />
      </Link>
      {showNav ? (
        <nav className="hidden items-center gap-8 font-semibold text-brand-body text-sm md:flex">
          <span>কীভাবে কাজ করে</span>
          <span>উদাহরণ</span>
          <span>দাম</span>
          <Link href="/designs" className="text-foreground hover:text-primary">
            আমার ডিজাইন
          </Link>
        </nav>
      ) : null}
      <div className="flex items-center gap-4">
        {rightSlot}
        <div className="flex overflow-hidden rounded-full border border-border font-semibold text-xs">
          <span className="bg-primary px-3 py-1.5 text-primary-foreground">বাংলা</span>
          <span className="px-3 py-1.5 text-muted-foreground">EN</span>
        </div>
        <Link href="/login" className="font-bold text-primary text-sm">
          লগ ইন
        </Link>
      </div>
    </header>
  );
}
