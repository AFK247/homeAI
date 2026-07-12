"use client";

import { BarChart3, Boxes, Image, LayoutDashboard, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/*
 * Admin sidebar nav. Client component (needs the active-route highlight).
 * Admin is English-only (internal tool), so labels are hardcoded.
 */
const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/designs", label: "Designs", icon: Image },
  { href: "/admin/sessions", label: "Sessions", icon: Users },
  { href: "/admin/events", label: "Events", icon: BarChart3 },
  { href: "/admin/furniture", label: "Furniture", icon: Boxes },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
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
