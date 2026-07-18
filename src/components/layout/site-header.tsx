"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { AuthButton } from "./auth-button";
import { LanguageToggle } from "./language-toggle";

/**
 * Top site header. Shown on every page. Reads translations via useTranslation and includes the
 * language toggle + auth control. `rightSlot` lets a page inject server-loaded controls — every
 * page passes <HeaderCreditBadge /> here so the credit balance shows app-wide.
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
        <AuthButton />
      </div>
    </header>
  );
}
