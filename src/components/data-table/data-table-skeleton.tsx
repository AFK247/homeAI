import { cn } from "@/lib/utils";

/*
 * Loading skeleton for the DataTable — used as the <Suspense fallback> on server
 * list pages while the serverRpc read resolves. Mirrors DataTable's real layout
 * (toolbar row → bordered table with header + rows → pagination footer) so the
 * shell doesn't jump when data arrives. Pulses via `animate-pulse`.
 */
export function DataTableSkeleton({
  columns = 6,
  rows = 8,
  filters = 2,
  search = true,
  className,
}: {
  columns?: number;
  rows?: number;
  filters?: number;
  search?: boolean;
  className?: string;
}) {
  const bar = "rounded bg-muted";
  const control = "rounded-md border border-border bg-background";

  return (
    <div
      className={cn(
        "w-full animate-pulse overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      {/* Toolbar: "Showing X-Y of Z" left; search + filters + buttons right */}
      <div className="flex flex-col items-center justify-between gap-3 px-5 py-4 md:flex-row">
        <div className={cn("h-5 w-40", bar)} />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {search && <div className={cn("h-9 w-full sm:w-64", control)} />}
          {Array.from({ length: filters }).map((_, i) => (
            <div key={`f-${i}`} className={cn("h-9 w-32", control)} />
          ))}
          <div className={cn("size-9", control)} />
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-full table-fixed border-spacing-0 border-border border-t">
          {/* Header row */}
          <thead className="[&_tr]:border-border [&_tr]:border-b">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th
                  key={`h-${i}`}
                  className="border-border border-r px-4 py-3 text-left last:border-r-0"
                >
                  <div className={cn("h-4 w-20", bar)} />
                </th>
              ))}
            </tr>
          </thead>
          {/* Body rows */}
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={`r-${r}`} className="border-border border-b last:border-b-0">
                {Array.from({ length: columns }).map((_, c) => (
                  <td
                    key={`c-${r}-${c}`}
                    className="border-border border-r px-4 py-3 last:border-r-0"
                  >
                    <div className={cn("h-4 w-full", bar)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col items-center justify-between gap-4 border-border border-t px-5 py-4 md:flex-row">
        <div className="flex items-center gap-3">
          <div className={cn("h-5 w-24", bar)} />
          <div className={cn("h-8 w-16", control)} />
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`p-${i}`} className={cn("size-8", control)} />
          ))}
        </div>
      </div>
    </div>
  );
}
