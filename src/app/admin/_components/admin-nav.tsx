"use client";

import { BarChart3, Boxes, Cpu, Image, LayoutDashboard, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGES } from "@/config/pages";
import { cn } from "@/lib/utils";

/*
 * Admin sidebar nav. Client component (needs the active-route highlight).
 * Admin is English-only (internal tool), so labels are hardcoded.
 */
const LINKS = [
  { href: PAGES.ADMIN.INDEX, label: "Overview", icon: LayoutDashboard },
  { href: PAGES.ADMIN.DESIGNS, label: "Designs", icon: Image },
  { href: PAGES.ADMIN.SESSIONS, label: "Sessions", icon: Users },
  { href: PAGES.ADMIN.EVENTS, label: "Events", icon: BarChart3 },
  { href: PAGES.ADMIN.FURNITURE, label: "Furniture", icon: Boxes },
  { href: PAGES.ADMIN.VENDORS, label: "Vendors", icon: Store },
  { href: PAGES.ADMIN.PROVIDER, label: "AI Provider", icon: Cpu },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
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
              active ? "bg-secondary text-secondary-foreground" : "text-brand-body hover:bg-muted",
            )}
          >
            <l.icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
