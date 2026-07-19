"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PAGES } from "@/config/pages";
import { cn } from "@/lib/utils";
import { rpc } from "@/server/rpc/client";
import { ScrapeStatusBadge } from "./_components/scrape-status";
import type { VendorStatus } from "./_modules/catalog.router";

/*
 * The vendor "tab bar" — a constant strip of vendor cards rendered by the catalog layout, so it
 * stays put on every vendor page (like tabs). Each card links to its vendor page and shows a LIVE
 * status badge, so all concurrent scrapes are visible at a glance from anywhere. The active
 * vendor's card is highlighted (from the URL). Polls fast while any run is active, slow at rest.
 */

const ACTIVE_MS = 1500;
const IDLE_MS = 8000;

export function CatalogTabs({ initial }: { initial: VendorStatus[] }) {
  const [vendors, setVendors] = useState<VendorStatus[]>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const poll = useCallback(async () => {
    try {
      const s = await rpc.catalog.allStatus();
      setVendors(s);
      return s.some((v) => v.running);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const anyRunning = await poll();
      if (!cancelled) timer.current = setTimeout(tick, anyRunning ? ACTIVE_MS : IDLE_MS);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  if (vendors.length === 0) {
    return <p className="text-brand-body text-sm">No vendors registered.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {vendors.map((v) => {
        const href = PAGES.ADMIN.CATALOG_VENDOR(v.slug);
        const active = pathname === href;
        return (
          <Link
            key={v.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-[150px] flex-col gap-1.5 rounded-xl border px-3.5 py-2.5 transition-colors",
              active
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:border-primary/50 hover:bg-muted",
            )}
          >
            <span className="font-semibold text-foreground text-sm">{v.name}</span>
            <ScrapeStatusBadge running={v.running} job={v.job} />
            <span className="text-brand-body text-xs">
              {v.staged} staged · {v.ingested} live{v.usesBrowser ? " · browser" : ""}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
