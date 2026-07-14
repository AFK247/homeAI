"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryParams } from "@/hooks/use-query-params";
import { cn } from "@/lib/utils";

/*
 * Reusable data table (reference convention). ONE component handles everything:
 * search + filters + clear + the table + pagination. Consumers pass config, not
 * assembled JSX — every list is a single <DataTable ... /> call.
 *
 *   <DataTable
 *     columns={columns}
 *     data={result.data}
 *     total={result.total} page={result.page} pageCount={result.pageCount} size={result.size}
 *     searchPlaceholder="Search designs…"
 *     filters={[{ paramKey: "status", label: "Status", options: GENERATION_STATUSES }]}
 *   />
 *
 * Search / filter / sort / pagination are URL-driven (?search, ?status, ?sort,
 * ?order, ?page, ?size); the server reads them and the BACKEND does the query.
 */

export interface DataTableColumn<T> {
  header: string;
  accessorKey: keyof T;
  /** Unique column id — set this for action columns or when two columns share an accessorKey. */
  id?: string;
  cell?: (row: T) => React.ReactNode;
  size?: number;
  sortable?: boolean;
  className?: string;
}

export interface DataTableFilter {
  paramKey: string;
  label: string;
  options: readonly string[];
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Pagination (omit to hide the footer). */
  total?: number;
  page?: number;
  pageCount?: number;
  size?: number;
  /** Toolbar search box (omit to hide). */
  searchPlaceholder?: string;
  /** Toolbar filter dropdowns. */
  filters?: DataTableFilter[];
  rowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

const PAGE_SIZES = [5, 10, 20, 30, 50];

function toText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return range(1, total);
  if (current <= 4) return [...range(1, 5), "…", total];
  if (current >= total - 3) return [1, "…", ...range(total - 4, total)];
  return [1, "…", ...range(current - 2, current + 2), "…", total];
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageCount,
  size,
  searchPlaceholder,
  filters = [],
  rowKey,
  onRowClick,
  emptyMessage = "No records found.",
  className,
}: DataTableProps<T>) {
  const { queryParams, updateParams, removeParams, refresh, isPending } = useQueryParams();
  const sort = queryParams.sort;
  const order = queryParams.order === "asc" ? "asc" : "desc";

  const hasPagination = total !== undefined && page && pageCount && size;
  const toolbarKeys = [...(searchPlaceholder ? ["search"] : []), ...filters.map((f) => f.paramKey)];
  const hasActiveFilter = toolbarKeys.some((k) => queryParams[k]);

  const key = (row: T, i: number) =>
    rowKey?.(row, i) ??
    (typeof (row as { id?: unknown }).id === "string" ? (row as { id: string }).id : String(i));

  function toggleSort(k: string) {
    if (sort === k) {
      updateParams({ sort: k, order: order === "asc" ? "desc" : "asc" }, { resetPage: false });
    } else {
      updateParams({ sort: k, order: "asc" }, { resetPage: false });
    }
  }

  const showCount = hasPagination;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {/* Toolbar: "Showing X-Y of Z" on the left; search + filters + Clear + Refresh on the right. */}
      <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 md:flex-row">
        {showCount ? (
          <span className="whitespace-nowrap font-medium text-brand-body text-sm">
            {total > 0
              ? `Showing ${(page - 1) * size + 1}-${Math.min(page * size, total)} of ${total}`
              : "No records found"}
          </span>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {searchPlaceholder ? <SearchInput placeholder={searchPlaceholder} /> : null}
          {filters.map((f) => (
            <select
              key={f.paramKey}
              value={queryParams[f.paramKey] ?? ""}
              onChange={(e) => updateParams({ [f.paramKey]: e.target.value || null })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">{f.label}: all</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ))}
          {hasActiveFilter ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => removeParams([...toolbarKeys, "page"])}
            >
              Clear <X className="size-3.5" />
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            title="Refresh"
            disabled={isPending}
            onClick={refresh}
          >
            <RefreshCcw className={cn("size-4", isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="relative min-w-full table-fixed border-spacing-0 border-border border-t text-left text-sm">
          <thead className="[&_tr]:border-border [&_tr]:border-b">
            <tr>
              {columns.map((col) => {
                const k = String(col.accessorKey);
                const colKey = col.id ?? k;
                return (
                  <th
                    key={colKey}
                    style={{ width: col.size }}
                    className="whitespace-nowrap border-border border-r px-4 py-3 text-left align-middle font-semibold text-[#6B7280] last:border-r-0"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(k)}
                        className="flex items-center gap-1.5 hover:text-foreground"
                      >
                        {col.header}
                        {sort === k ? (
                          order === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              // Loading — skeleton rows (pulse bars) sized to the page.
              Array.from({ length: Math.min(size ?? 8, 10) }).map((_, rowIdx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                <tr key={`skeleton-${rowIdx}`} className="border-border border-b last:border-b-0">
                  {columns.map((col) => (
                    <td
                      key={col.id ?? String(col.accessorKey)}
                      className="border-border border-r px-4 py-3 last:border-r-0"
                    >
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state — centered icon + message.
              <tr>
                <td colSpan={columns.length} className="p-0">
                  <div className="flex w-full flex-col items-center justify-center gap-4 p-12">
                    <SearchX className="size-14 text-muted-foreground/50" strokeWidth={1} />
                    <p className="font-medium text-brand-body text-base">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={key(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-border border-b transition-colors last:border-b-0 hover:bg-muted/50",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id ?? String(col.accessorKey)}
                      className={cn(
                        "relative whitespace-nowrap border-border border-r px-4 py-2.5 align-middle text-foreground tabular-nums last:border-r-0",
                        col.className,
                      )}
                    >
                      {col.cell ? col.cell(row) : toText(row[col.accessorKey])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasPagination && total > 0 ? (
        <div className="border-border border-t px-5 py-4">
          <TableFooter page={page} pageCount={pageCount} size={size} />
        </div>
      ) : null}
    </div>
  );
}

/** Debounced, URL-driven search input (writes ?search=). */
function SearchInput({ placeholder }: { placeholder: string }) {
  const { queryParams, updateParams } = useQueryParams();
  const [value, setValue] = useState(queryParams.search ?? "");
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = setTimeout(() => {
      const next = value.trim();
      if (next !== (queryParams.search ?? "")) updateParams({ search: next || null });
    }, 300);
    return () => clearTimeout(id);
  }, [value, queryParams.search, updateParams]);

  return (
    <div className="relative flex-1 sm:max-w-xs">
      <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

/** Rows-per-page + numbered page buttons (writes ?page= / ?size=). */
function TableFooter({
  page,
  pageCount,
  size,
}: {
  page: number;
  pageCount: number;
  size: number;
}) {
  const { updateParams } = useQueryParams();
  const goto = (p: number) => updateParams({ page: p }, { resetPage: false });
  const nums = pageNumbers(page, pageCount);

  return (
    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="flex items-center gap-3 text-brand-body text-sm">
        <span className="whitespace-nowrap font-medium">Rows per page</span>
        <select
          value={size}
          onChange={(e) => updateParams({ size: e.target.value })}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <PageButton onClick={() => goto(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </PageButton>
        {nums.map((n, i) =>
          n === "…" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis positions are static
            <span key={`e${i}`} className="px-2 text-muted-foreground text-sm">
              …
            </span>
          ) : (
            <PageButton key={n} onClick={() => goto(n)} active={n === page}>
              {n}
            </PageButton>
          ),
        )}
        <PageButton
          onClick={() => goto(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-medium text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-card",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
