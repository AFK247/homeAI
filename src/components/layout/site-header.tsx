"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { LanguageToggle } from "./language-toggle";

/**
 * Top site header. Shown on every page. Reads translations via useTranslation
 * and includes the working language toggle. `rightSlot` lets a page inject extra
 * controls (e.g. the result page's CreditBadge).
 */
export function SiteHeader({
  showNav = true,
  rightSlot,
}: {
  showNav?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const { dict } = useTranslation();
  return (
    <header className="flex items-center justify-between border-border border-b bg-card px-5 py-4 md:px-11">
      <Link href={PAGES.HOME}>
        <Logo size="md" />
      </Link>
      {showNav ? (
        <nav className="hidden items-center gap-8 font-semibold text-brand-body text-sm md:flex">
          <Link href={`${PAGES.HOME}#how-it-works`} className="hover:text-primary">
            {dict.nav.howItWorks}
          </Link>
          <Link href={`${PAGES.HOME}#examples`} className="hover:text-primary">
            {dict.nav.examples}
          </Link>
          <Link href={PAGES.PRICING} className="hover:text-primary">
            {dict.nav.pricing}
          </Link>
          <Link href={PAGES.DESIGNS} className="text-foreground hover:text-primary">
            {dict.nav.myDesigns}
          </Link>
        </nav>
      ) : null}
      <div className="flex items-center gap-4">
        {rightSlot}
        <LanguageToggle />
        <Link href={PAGES.LOGIN} className="font-bold text-primary text-sm">
          {dict.common.login}
        </Link>
      </div>
    </header>
  );
}
