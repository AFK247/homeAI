import Link from "next/link";
import { PAGES } from "@/config/pages";
import { cn } from "@/lib/utils";

/*
 * Shared tab bar for the Categories area. Each tab is a REAL route (Categories →
 * /admin/categories, Vendor mappings → /admin/categories/mappings), so switching is a proper
 * navigation (own URL + history entry), not a query-param swap. Rendered on both pages so
 * mappings stays discoverable without a separate sidebar item.
 */
export function CategoryTabs({ active }: { active: "categories" | "mappings" }) {
  const tabs = [
    { key: "categories", label: "Categories", href: PAGES.ADMIN.CATEGORIES },
    { key: "mappings", label: "Vendor mappings", href: PAGES.ADMIN.CATEGORY_MAPPINGS },
  ] as const;
  return (
    <div className="mb-5 flex gap-1 border-border border-b">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-4 py-2 font-semibold text-sm transition-colors",
            active === t.key
              ? "border-primary text-foreground"
              : "border-transparent text-brand-body hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
