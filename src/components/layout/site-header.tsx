"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { AuthButton } from "./auth-button";
import { LanguageToggle } from "./language-toggle";

/**
 * Top site header. Shown on every page. Reads translations via useTranslation and includes the
 * language toggle + auth control. `rightSlot` lets a page inject server-loaded controls — every
 * page passes <HeaderCreditBadge /> here so the credit balance shows app-wide.
 *
 * The current page is marked with brand-green text + a small dot (no underline).
 */
export function SiteHeader({
  showNav = true,
  rightSlot,
}: {
  showNav?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const { dict } = useTranslation();
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between border-border border-b bg-card px-5 py-4 md:px-11">
      <Link href={PAGES.HOME}>
        <Logo size="md" />
      </Link>
      {showNav ? (
        <nav className="hidden items-center gap-8 font-semibold text-brand-body text-sm md:flex">
          <NavLink href={PAGES.HOME} active={pathname === PAGES.HOME}>
            {dict.nav.howItWorks}
          </NavLink>
          <NavLink href={PAGES.PRICING} active={pathname === PAGES.PRICING}>
            {dict.nav.pricing}
          </NavLink>
          <NavLink href={PAGES.DESIGNS} active={pathname.startsWith(PAGES.DESIGNS)}>
            {dict.nav.myDesigns}
          </NavLink>
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

/**
 * A top-nav link with an active state: the current page shows brand-green text and a small, dim
 * underline centered under it — a short accent line (not full-width). Inactive links tint green on
 * hover.
 */
function NavLink({
  href,
  active = false,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("relative transition-colors hover:text-primary", active && "text-primary")}
    >
      {children}
      {active ? (
        <span className="-bottom-1.5 -translate-x-1/2 absolute left-1/2 h-0.5 w-4 rounded-full bg-primary/35" />
      ) : null}
    </Link>
  );
}
