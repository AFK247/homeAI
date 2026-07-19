"use client";

import {
  BarChart3,
  Boxes,
  Coins,
  Cpu,
  CreditCard,
  DownloadCloud,
  Image,
  LayoutDashboard,
  Sparkles,
  Store,
  Tags,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGES } from "@/config/pages";
import { cn } from "@/lib/utils";

/*
 * Admin sidebar nav. Client component (needs the active-route highlight).
 * Admin is English-only (internal tool), so labels are hardcoded. Grouped into
 * labeled sections (Overview stands alone; then Activity / Catalog / Billing / System).
 */
const SECTIONS: {
  title: string | null;
  links: { href: string; label: string; icon: typeof Image }[];
}[] = [
  { title: null, links: [{ href: PAGES.ADMIN.INDEX, label: "Overview", icon: LayoutDashboard }] },
  {
    title: "Activity",
    links: [
      { href: PAGES.ADMIN.DESIGNS, label: "Designs", icon: Image },
      { href: PAGES.ADMIN.EVENTS, label: "Events", icon: BarChart3 },
      { href: PAGES.ADMIN.GENERATIONS, label: "Generations", icon: Sparkles },
    ],
  },
  {
    title: "Catalog",
    links: [
      { href: PAGES.ADMIN.FURNITURE, label: "Furniture", icon: Boxes },
      { href: PAGES.ADMIN.CATEGORIES, label: "Categories", icon: Tags },
      { href: PAGES.ADMIN.VENDORS, label: "Vendors", icon: Store },
      { href: PAGES.ADMIN.CATALOG, label: "Catalog scraping", icon: DownloadCloud },
    ],
  },
  {
    title: "Billing",
    links: [
      { href: PAGES.ADMIN.USERS, label: "Users & usage", icon: UserCog },
      { href: PAGES.ADMIN.PAYMENTS, label: "Payments", icon: CreditCard },
      { href: PAGES.ADMIN.CREDITS, label: "Credit ledger", icon: Coins },
    ],
  },
  {
    title: "System",
    links: [{ href: PAGES.ADMIN.PROVIDER, label: "AI Provider", icon: Cpu }],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4">
      {SECTIONS.map((section) => (
        <div key={section.title ?? "root"} className="flex flex-col gap-1">
          {section.title ? (
            <div className="px-3 pb-1 font-semibold text-[11px] text-brand-faint uppercase tracking-wide">
              {section.title}
            </div>
          ) : null}
          {section.links.map((l) => {
            const active =
              l.href === PAGES.ADMIN.INDEX
                ? pathname === PAGES.ADMIN.INDEX
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 font-semibold text-sm transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-brand-body hover:bg-muted",
                )}
              >
                <l.icon className="size-4" />
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
