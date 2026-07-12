import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/** Top site header (design). Language toggle is visual-only until i18n wiring (Stage D). */
export function SiteHeader({ showNav = true }: { showNav?: boolean }) {
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
        </nav>
      ) : null}
      <div className="flex items-center gap-4">
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
