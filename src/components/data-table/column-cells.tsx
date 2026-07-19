import { type FormatDateTimeOptions, formatDateTime } from "@/lib/date";
import { formatBdt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "./data-table";

/*
 * Reusable DataTable column factories — mirrors the reference codebase's `getCell*Column` family
 * (proa-erp `data-table/column-cells`). Each takes `{ header, accessorKey, ...columnOverrides }`
 * and returns a full, typed column def, so a columns.tsx reads as a list of one-line builders:
 *
 *   getCellDateColumn({ header: "Created", accessorKey: "createdAt" })
 *   getCellCurrencyColumn({ header: "Amount", accessorKey: "amountBdt" })
 *   getCellNumericColumn({ header: "Credits", accessorKey: "credits" })
 *
 * Every builder spreads the caller's overrides LAST, so any column prop (sortable, className, a
 * custom cell, id) can still be set per-use. Empty/missing values render as an em dash. Add new
 * builders here as patterns repeat — this is the one place cell rendering conventions live.
 */

/** The shared option shape: a column def minus the `cell` (each builder supplies its own). */
type CellColumnOptions<T> = Omit<DataTableColumn<T>, "cell"> & {
  /** Optionally still override the rendered cell. */
  cell?: DataTableColumn<T>["cell"];
};

const DASH = "—";

/**
 * A date/time column. Renders via the central `formatDateTime` (Asia/Dhaka default, timezone-ready
 * — pass `date: { timeZone, preset, locale }`). Sortable + muted by default; override via the
 * spread. Empty value → em dash.
 */
export function getCellDateColumn<T>(
  options: CellColumnOptions<T> & { date?: FormatDateTimeOptions },
): DataTableColumn<T> {
  const { date, accessorKey, header, ...rest } = options;
  return {
    header,
    accessorKey,
    sortable: true,
    className: "whitespace-nowrap text-muted-foreground text-xs",
    cell: (row) => {
      const value = row[accessorKey] as Date | string | number | null | undefined;
      return value == null ? DASH : formatDateTime(value, date);
    },
    ...rest,
  };
}

/**
 * A BDT currency column. Right-aligned (like the reference's currency cells), formatted with the
 * ৳ symbol via `formatBdt`. Zero / null / non-numeric → em dash. `withSymbol: false` drops the ৳.
 */
export function getCellCurrencyColumn<T>(
  options: CellColumnOptions<T> & { withSymbol?: boolean },
): DataTableColumn<T> {
  const { withSymbol = true, accessorKey, header, className, ...rest } = options;
  return {
    header,
    accessorKey,
    className: cn("text-right tabular-nums text-foreground", className),
    cell: (row) => {
      const raw = row[accessorKey];
      const value = Number(raw);
      if (raw == null || Number.isNaN(value) || value === 0) return DASH;
      return formatBdt(value, "en", withSymbol);
    },
    ...rest,
  };
}

/**
 * A plain numeric column. Right-aligned, thousands-grouped. Null/non-numeric → em dash. Use for
 * counts / credits where a currency symbol would be wrong.
 */
export function getCellNumericColumn<T>(options: CellColumnOptions<T>): DataTableColumn<T> {
  const { accessorKey, header, className, ...rest } = options;
  return {
    header,
    accessorKey,
    className: cn("text-right tabular-nums text-foreground", className),
    cell: (row) => {
      const raw = row[accessorKey];
      const value = Number(raw);
      if (raw == null || Number.isNaN(value)) return DASH;
      return value.toLocaleString("en-US");
    },
    ...rest,
  };
}
