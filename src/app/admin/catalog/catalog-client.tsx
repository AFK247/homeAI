"use client";

import { GitCompare, Loader2, Play, RotateCcw, Square, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { rpc } from "@/server/rpc/client";
import type { CatalogDiff, CatalogVendor } from "./_modules/catalog.router";

/*
 * Catalog scraping UI (local operator tool). For a selected vendor:
 *   • Scrape  → opens an SSE stream (/api/admin/scrape/<vendor>); products stream into a live
 *               table with a running counter. Each is already checkpointed server-side.
 *   • Stop    → closes the stream; the server marks the job cancelled (done rows kept).
 *   • Resume  → just Scrape again — the server skips already-staged URLs.
 *   • Compare → diff staged vs the live catalog (new / price-changed / removed).
 *   • Ingest  → promote staged rows into furniture_items.
 * Admin is English-only (existing convention), so strings are inline.
 */

// One product as it arrives over SSE (mirrors ScrapedProduct's UI-relevant fields).
interface LiveProduct {
  name: string;
  priceBdt: number | null;
  category: string | null;
  imageUrl: string | null;
  sourceUrl: string;
}

type ScrapeEvent =
  | { type: "start"; total: number; skipped: number }
  | { type: "product"; done: number; total: number; product: LiveProduct }
  | { type: "failed"; url: string; done: number; failed: number }
  | { type: "done" | "cancelled" | "error"; inserted: number; failed: number; message?: string };

export function CatalogClient({ vendors }: { vendors: CatalogVendor[] }) {
  const [selected, setSelected] = useState(vendors[0]?.slug ?? "");
  const [scraping, setScraping] = useState(false);
  const [counter, setCounter] = useState<{ done: number; total: number; failed: number } | null>(
    null,
  );
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [diff, setDiff] = useState<CatalogDiff | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const vendor = vendors.find((v) => v.slug === selected);

  function startScrape() {
    setProducts([]);
    setDiff(null);
    setCounter({ done: 0, total: 0, failed: 0 });
    setScraping(true);

    const es = new EventSource(`/api/admin/scrape/${selected}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const evt = JSON.parse(e.data) as ScrapeEvent;
      if (evt.type === "start") {
        setCounter({ done: 0, total: evt.total, failed: 0 });
        if (evt.skipped > 0) toast.info(`Resuming — skipping ${evt.skipped} already scraped.`);
      } else if (evt.type === "product") {
        setProducts((prev) => [evt.product, ...prev]);
        setCounter((c) => ({ done: evt.done, total: evt.total, failed: c?.failed ?? 0 }));
      } else if (evt.type === "failed") {
        setCounter((c) => ({ done: evt.done, total: c?.total ?? 0, failed: evt.failed }));
      } else {
        // done | cancelled | error — terminal.
        stopStream();
        if (evt.type === "done") toast.success(`Scraped ${evt.inserted} products.`);
        else if (evt.type === "cancelled") toast.info(`Stopped — ${evt.inserted} saved.`);
        else toast.error(evt.message || "Scrape failed.");
      }
    };

    es.onerror = () => {
      // Fires on normal server close too; only surface if we were mid-run.
      stopStream();
    };
  }

  function stopStream() {
    esRef.current?.close();
    esRef.current = null;
    setScraping(false);
  }

  async function compare() {
    setDiff(null);
    try {
      const d = await rpc.catalog.diff({ vendor: selected });
      setDiff(d);
    } catch {
      toast.error("Could not compute the diff.");
    }
  }

  async function ingest() {
    setIngesting(true);
    try {
      const r = await rpc.catalog.ingest({ vendor: selected });
      toast.success(
        `Ingested: ${r.inserted} new, ${r.updated} updated` +
          (r.unmatched ? `, ${r.unmatched} awaiting category approval` : "") +
          (r.newCategories ? ` · ${r.newCategories} new categories pending` : ""),
      );
    } catch {
      toast.error("Ingest failed.");
    } finally {
      setIngesting(false);
    }
  }

  if (vendors.length === 0) {
    return <p className="text-brand-body text-sm">No vendors registered.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Vendor picker */}
      <div className="flex flex-wrap gap-2">
        {vendors.map((v) => (
          <button
            key={v.slug}
            type="button"
            disabled={scraping}
            onClick={() => {
              setSelected(v.slug);
              setProducts([]);
              setDiff(null);
              setCounter(null);
            }}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-2.5 text-left transition-colors disabled:opacity-50",
              v.slug === selected
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span className="font-semibold text-foreground text-sm">{v.name}</span>
            <span className="text-brand-body text-xs">
              {v.staged} staged · {v.ingested} live{v.usesBrowser ? " · browser" : ""}
            </span>
          </button>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        {scraping ? (
          <Button variant="destructive" onClick={stopStream}>
            <Square className="size-4" /> Stop
          </Button>
        ) : (
          <Button onClick={startScrape}>
            {(vendor?.staged ?? 0) > 0 ? (
              <>
                <RotateCcw className="size-4" /> Scrape / resume
              </>
            ) : (
              <>
                <Play className="size-4" /> Scrape
              </>
            )}
          </Button>
        )}
        <Button variant="outline" onClick={compare} disabled={scraping}>
          <GitCompare className="size-4" /> Compare with DB
        </Button>
        <Button variant="secondary" onClick={ingest} disabled={scraping || ingesting}>
          {ingesting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Ingest to catalog
        </Button>

        {counter ? (
          <span className="ml-auto flex items-center gap-2 font-semibold text-sm">
            {scraping ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
            <span className="text-foreground">
              {counter.done}
              {counter.total ? ` / ${counter.total}` : ""}
            </span>
            {counter.failed > 0 ? (
              <span className="text-destructive">· {counter.failed} failed</span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* Diff view */}
      {diff ? <DiffView diff={diff} /> : null}

      {/* Live streaming products */}
      {products.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-brand-body text-xs">
              <tr>
                <th className="p-3 text-left font-semibold">Image</th>
                <th className="p-3 text-left font-semibold">Name</th>
                <th className="p-3 text-left font-semibold">Category</th>
                <th className="p-3 text-right font-semibold">Price (৳)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sourceUrl} className="border-border border-t">
                  <td className="p-2">
                    {p.imageUrl ? (
                      // biome-ignore lint/performance/noImgElement: hotlinked vendor image (admin tool)
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="size-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="size-12 rounded-lg bg-muted" />
                    )}
                  </td>
                  <td className="max-w-xs p-3">
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 font-medium text-foreground hover:text-primary"
                    >
                      {p.name}
                    </a>
                  </td>
                  <td className="p-3 text-brand-body capitalize">{p.category ?? "—"}</td>
                  <td className="p-3 text-right font-semibold text-foreground">
                    {p.priceBdt?.toLocaleString() ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

/** Colour-coded diff of staged vs live: new (green), price-changed (amber), removed (red). */
function DiffView({ diff }: { diff: CatalogDiff }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
      <DiffStat label="New" count={diff.created.length} className="text-emerald-600" />
      <DiffStat label="Price changed" count={diff.changed.length} className="text-amber-600" />
      <DiffStat label="Removed" count={diff.removed.length} className="text-destructive" />
      <DiffStat label="Unchanged" count={diff.same} className="text-brand-body" />

      {diff.changed.length > 0 ? (
        <div className="sm:col-span-4">
          <p className="mb-2 font-semibold text-foreground text-xs">Price changes</p>
          <ul className="flex flex-col gap-1 text-sm">
            {diff.changed.slice(0, 20).map((c) => (
              <li key={c.url} className="flex items-center justify-between gap-3">
                <span className="truncate text-foreground">{c.name}</span>
                <span className="shrink-0 text-brand-body">
                  ৳{c.oldPrice?.toLocaleString() ?? "?"} →{" "}
                  <span className="font-semibold text-amber-600">
                    ৳{c.newPrice?.toLocaleString() ?? "?"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function DiffStat({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className={cn("font-serif font-extrabold text-2xl", className)}>{count}</div>
      <div className="text-brand-body text-xs">{label}</div>
    </div>
  );
}
