"use client";

import {
  GitCompare,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useModal } from "@/components/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { rpc } from "@/server/rpc/client";
import type { CatalogDiff, CatalogVendor, RunStatus } from "./_modules/catalog.router";

/*
 * Catalog scraping UI (local operator tool). The scrape runs as a DETACHED background job on the
 * server — this UI only STARTS/STOPS it and POLLS its status, so refreshing or leaving the page
 * never stops a run (on return it re-polls and picks up wherever it is). For a selected vendor:
 *   • Scrape / Resume / Fresh re-scrape → start a background run (fresh = re-fetch everything).
 *   • Stop     → signal the running job to halt (staged rows kept).
 *   • Restart  → stop + fresh re-scrape.
 *   • Compare  → diff staged vs the live catalog (new / price-changed / removed).
 *   • Ingest   → promote staged rows into furniture_items.
 * Admin is English-only (existing convention), so strings are inline.
 */

const POLL_MS = 1500;

type LiveProduct = RunStatus["products"][number];
type JobRow = NonNullable<RunStatus["job"]>;

export function CatalogClient({ vendors }: { vendors: CatalogVendor[] }) {
  const [selected, setSelected] = useState(vendors[0]?.slug ?? "");
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [diff, setDiff] = useState<CatalogDiff | null>(null);
  const [comparing, setComparing] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [busy, setBusy] = useState(false); // a start/stop request is in flight
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRunning = useRef(false);
  const { openModal, closeModal } = useModal();

  const vendor = vendors.find((v) => v.slug === selected);
  const job: JobRow | null = status?.job ?? null;
  const running = status?.running ?? false;
  const products: LiveProduct[] = status?.products ?? [];

  // After a preview, is there anything to publish? (new items or price changes). Only meaningful
  // once a diff exists — before previewing we don't know, so Publish stays enabled.
  const nothingToPublish = diff !== null && diff.created.length === 0 && diff.changed.length === 0;
  const hasStaged = (vendor?.staged ?? 0) > 0;

  // One status fetch.
  const poll = useCallback(async (v: string) => {
    try {
      const s = await rpc.catalog.runStatus({ vendor: v });
      setStatus(s);
      return s.running;
    } catch {
      return false;
    }
  }, []);

  // Recurring poll — polls WHILE a run is in flight and STOPS once idle (so the status API isn't
  // hammered forever at rest). Called on mount / vendor change (to reconnect to any in-progress
  // run) and again when a scrape is started. Self-cancels the previous loop before starting.
  const startPolling = useCallback(
    (v: string) => {
      if (pollRef.current) clearTimeout(pollRef.current);
      const tick = async () => {
        const isRunning = await poll(v);
        if (prevRunning.current && !isRunning) toast.info("Scrape finished.");
        prevRunning.current = isRunning;
        pollRef.current = isRunning ? setTimeout(tick, POLL_MS) : null;
      };
      tick();
    },
    [poll],
  );

  useEffect(() => {
    startPolling(selected);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [selected, startPolling]);

  async function startScrape(fresh = false) {
    setBusy(true);
    setDiff(null);
    try {
      const r = await rpc.catalog.startScrape({ vendor: selected, fresh });
      if (!r.ok) {
        toast.error(r.reason === "already_running" ? "Already running." : "Could not start.");
      } else {
        toast.info(fresh ? "Fresh re-scrape started." : "Scrape started.");
        prevRunning.current = true;
        startPolling(selected); // restart the poll loop for the new run
      }
    } catch {
      toast.error("Could not start the scrape.");
    } finally {
      setBusy(false);
    }
  }

  async function stopScrape() {
    setBusy(true);
    try {
      await rpc.catalog.stopScrape({ vendor: selected });
      toast.info("Stopping…");
      await poll(selected);
    } catch {
      toast.error("Could not stop.");
    } finally {
      setBusy(false);
    }
  }

  // Restart = stop the current run, then fresh re-scrape.
  async function restartScrape() {
    await stopScrape();
    await startScrape(true);
  }

  async function compare() {
    setComparing(true);
    setDiff(null);
    try {
      const d = await rpc.catalog.diff({ vendor: selected });
      setDiff(d);
    } catch {
      toast.error("Could not compute the diff.");
    } finally {
      setComparing(false);
    }
  }

  // The actual write to the live catalog.
  async function doPublish() {
    setIngesting(true);
    try {
      const r = await rpc.catalog.ingest({ vendor: selected });
      toast.success(
        `Published: ${r.inserted} added, ${r.updated} updated` +
          (r.unmatched ? `, ${r.unmatched} awaiting category approval` : "") +
          (r.newCategories ? ` · ${r.newCategories} new categories pending` : ""),
      );
      await poll(selected); // refresh staged/live counts
    } catch {
      toast.error("Publish failed.");
    } finally {
      setIngesting(false);
    }
  }

  // Publish = the DESTRUCTIVE step (writes to the live catalog users see). Pre-compute the impact
  // via the diff, then confirm before committing.
  async function publish() {
    setIngesting(true);
    let impact = "";
    try {
      const d = await rpc.catalog.diff({ vendor: selected });
      impact = `This will add ${d.created.length} new and update ${d.changed.length + d.same} existing catalog items that users see`;
      if (d.removed.length > 0)
        impact += ` (${d.removed.length} catalog items no longer on the site are left as-is)`;
      impact += ".";
    } catch {
      impact = "This writes the scraped products into the live catalog users see.";
    } finally {
      setIngesting(false);
    }
    openModal({
      type: "alert",
      variant: "destructive",
      title: `Publish ${vendor?.name ?? selected} to the live catalog?`,
      description: `${impact} Existing items are overwritten. This is what shoppers see.`,
      actionLabel: "Publish",
      onConfirm: async () => {
        closeModal();
        await doPublish();
      },
    });
  }

  if (vendors.length === 0) {
    return <p className="text-brand-body text-sm">No vendors registered.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Plain-English explanation of the 3-stage flow, so the buttons aren't cryptic. */}
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-brand-body text-sm">
        <span className="font-semibold text-foreground">How this works — 3 steps:</span>{" "}
        <span className="font-medium text-foreground">1. Scrape</span> downloads products from the
        vendor's website into a staging area (not live yet).{" "}
        <span className="font-medium text-foreground">2. Preview changes</span> shows what would
        change vs the live catalog — safe, read-only.{" "}
        <span className="font-medium text-foreground">3. Publish to catalog</span> writes the staged
        products into the live catalog shoppers see (overwrites existing items).
      </div>

      {/* Vendor picker */}
      <div className="flex flex-wrap gap-2">
        {vendors.map((v) => (
          <button
            key={v.slug}
            type="button"
            onClick={() => {
              setSelected(v.slug);
              setDiff(null);
            }}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-2.5 text-left transition-colors",
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
        {running ? (
          <>
            <Button variant="destructive" onClick={stopScrape} disabled={busy}>
              <Square className="size-4" /> Stop
            </Button>
            <Button variant="outline" onClick={restartScrape} disabled={busy}>
              <RefreshCw className="size-4" /> Restart
            </Button>
          </>
        ) : hasStaged ? (
          <>
            {/* Already staged → Resume (continue an interrupted run, skips done) OR Fresh re-scrape
                (re-fetch everything, refresh prices). A fully-staged vendor needs Fresh to scrape. */}
            <Button onClick={() => startScrape(false)} disabled={busy}>
              <RotateCcw className="size-4" /> Resume
            </Button>
            <Button variant="outline" onClick={() => startScrape(true)} disabled={busy}>
              <RefreshCw className="size-4" /> Fresh re-scrape
            </Button>
          </>
        ) : (
          <Button onClick={() => startScrape(false)} disabled={busy}>
            <Play className="size-4" /> Scrape
          </Button>
        )}
        {/* A visual divider: scraping (left) vs publishing to the live catalog (right). */}
        <div className="mx-1 hidden h-8 w-px bg-border sm:block" />

        <Button variant="outline" onClick={compare} disabled={running || comparing}>
          {comparing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GitCompare className="size-4" />
          )}
          Preview changes
        </Button>
        <Button
          variant="secondary"
          onClick={publish}
          disabled={running || ingesting || nothingToPublish || !hasStaged}
        >
          {ingesting ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Publish to catalog
        </Button>

        {/* Helpful text: why Publish is disabled. */}
        {!hasStaged ? (
          <span className="text-brand-body text-xs">
            Scrape a vendor first — nothing staged yet.
          </span>
        ) : nothingToPublish ? (
          <span className="text-brand-body text-xs">
            Nothing new to publish — the catalog is already up to date.
          </span>
        ) : null}
      </div>

      {/* Run status panel — live progress + phase, from the polled job. */}
      {job ? <RunStatusPanel job={job} running={running} /> : null}

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

/**
 * Live run panel — the phase label (Discovering / Scraping N/total / Done / Stopped / Failed), the
 * counters, and any error or health warning. Derived from the polled scrape_jobs row, so it's
 * correct after a page refresh too.
 */
function RunStatusPanel({ job, running }: { job: JobRow; running: boolean }) {
  const { statusEmoji, statusVariant, statusLabel } = describeStatus(job.status, running);

  // Phase: before URLs are known → "Discovering URLs…"; during → "Scraping done/total".
  const phase = running
    ? job.totalUrls > 0
      ? `Scraping ${job.doneUrls} / ${job.totalUrls}`
      : "Discovering URLs…"
    : statusLabel;

  // Health warning: a high fail rate this run usually means a selector break / site change.
  const attempted = job.doneUrls + job.failedUrls;
  const healthWarning =
    !running && attempted >= 4 && job.failedUrls / attempted >= 0.5
      ? `${job.failedUrls}/${attempted} URLs failed — likely a selector break or site change.`
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={statusVariant}>
          {statusEmoji} {phase}
        </Badge>
        {running ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
        <span className="font-semibold text-foreground text-sm tabular-nums">
          {job.doneUrls}
          {job.totalUrls ? ` / ${job.totalUrls}` : ""} scraped
        </span>
        {job.failedUrls > 0 ? (
          <span className="text-destructive text-sm">· {job.failedUrls} failed</span>
        ) : null}
        <span className="ml-auto text-brand-body text-xs">
          started {formatDateTime(job.startedAt, { preset: "datetime" })}
        </span>
      </div>

      {healthWarning ? (
        <div className="flex items-center gap-2 text-amber-600 text-sm">
          <TriangleAlert className="size-4 shrink-0" /> {healthWarning}
        </div>
      ) : null}
      {job.error && !healthWarning ? (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <TriangleAlert className="size-4 shrink-0" /> {job.error}
        </div>
      ) : null}
    </div>
  );
}

function describeStatus(
  status: string,
  running: boolean,
): {
  statusEmoji: string;
  statusVariant: "default" | "secondary" | "destructive";
  statusLabel: string;
} {
  if (running || status === "running")
    return { statusEmoji: "⏳", statusVariant: "secondary", statusLabel: "Running" };
  if (status === "done") return { statusEmoji: "✓", statusVariant: "default", statusLabel: "Done" };
  if (status === "cancelled")
    return { statusEmoji: "◼", statusVariant: "secondary", statusLabel: "Stopped" };
  return { statusEmoji: "⚠", statusVariant: "destructive", statusLabel: "Interrupted" };
}

/** Read-only preview of what "Publish" would change: staged (scraped) vs the live catalog. */
function DiffView({ diff }: { diff: CatalogDiff }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <p className="font-bold text-foreground">Preview — what publishing would change</p>
        <p className="text-brand-body text-xs">
          Scraped products vs the live catalog. Nothing is written until you click “Publish to
          catalog”.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <DiffStat
          label="New (will be added)"
          count={diff.created.length}
          className="text-emerald-600"
        />
        <DiffStat
          label="Price changed (will update)"
          count={diff.changed.length}
          className="text-amber-600"
        />
        <DiffStat
          label="Gone from site (kept)"
          count={diff.removed.length}
          className="text-destructive"
        />
        <DiffStat label="Unchanged" count={diff.same} className="text-brand-body" />
      </div>

      {diff.changed.length > 0 ? (
        <div>
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
