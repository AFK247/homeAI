/*
 * Date/time formatting — built on the native Intl API (no date-fns / date-fns-tz needed). Intl
 * has first-class IANA timezone support, so `timeZone` is just a parameter: pass "Asia/Dhaka",
 * "UTC", or any zone and the same call renders it there. The admin default is "4:16 PM, Jul 19".
 *
 * Usage:
 *   formatDateTime(row.createdAt)                       → "4:16 PM, Jul 19"
 *   formatDateTime(row.createdAt, { preset: "date" })   → "Jul 19, 2026"
 *   formatDateTime(row.createdAt, { timeZone: "UTC" })  → same instant, rendered in UTC
 *   formatDateTime(row.createdAt, { locale: "en-GB", options: { weekday: "short" } })
 *
 * Presets pick the field set + assembly; `options`/`locale`/`timeZone` override piece-by-piece,
 * so new formats are a config change, never a rewrite.
 */

/** IANA zone the admin renders in by default. Central place to flip if the business moves zones. */
export const DEFAULT_TIME_ZONE = "Asia/Dhaka";

export type DatePreset =
  | "datetime" // "4:16 PM, Jul 19"      (admin table default)
  | "datetimeYear" // "4:16 PM, Jul 19, 2026"
  | "date" // "Jul 19, 2026"
  | "dateShort" // "Jul 19"
  | "time"; // "4:16 PM"

type DateInput = Date | string | number;

export interface FormatDateTimeOptions {
  /** Named format. Default "datetime" → "4:16 PM, Jul 19". */
  preset?: DatePreset;
  /** IANA timezone (e.g. "Asia/Dhaka", "UTC"). Defaults to DEFAULT_TIME_ZONE. */
  timeZone?: string;
  /** BCP-47 locale for month names / AM-PM. Default "en-US". */
  locale?: string;
  /** Escape hatch: extra Intl options merged over the preset's (e.g. add `weekday`). */
  options?: Intl.DateTimeFormatOptions;
}

/** The Intl field set each preset needs (assembly is done from the parts below). */
const PRESET_FIELDS: Record<DatePreset, Intl.DateTimeFormatOptions> = {
  datetime: { hour: "numeric", minute: "2-digit", hour12: true, month: "short", day: "numeric" },
  datetimeYear: {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  date: { month: "short", day: "numeric", year: "numeric" },
  dateShort: { month: "short", day: "numeric" },
  time: { hour: "numeric", minute: "2-digit", hour12: true },
};

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

/**
 * Format a date/time. Returns "" for a null/invalid input (so table cells never throw). The
 * assembly deliberately builds the string from Intl parts rather than a raw `format()` so the
 * shape ("time, date") is stable across locales and we control the separators.
 */
export function formatDateTime(
  input: DateInput | null | undefined,
  opts: FormatDateTimeOptions = {},
): string {
  if (input == null) return "";
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "";

  const preset = opts.preset ?? "datetime";
  const fmt = new Intl.DateTimeFormat(opts.locale ?? "en-US", {
    timeZone: opts.timeZone ?? DEFAULT_TIME_ZONE,
    ...PRESET_FIELDS[preset],
    ...opts.options,
  });

  // When callers pass extra `options` (escape hatch), just trust Intl's own ordering.
  if (opts.options) return fmt.format(date);

  const parts = fmt.formatToParts(date);
  const p = (type: Intl.DateTimeFormatPartTypes) => parts.find((x) => x.type === type)?.value ?? "";

  const time = `${p("hour")}:${p("minute")} ${p("dayPeriod")}`;
  const monthDay = `${p("month")} ${p("day")}`;
  const dateWithYear = p("year") ? `${monthDay}, ${p("year")}` : monthDay;

  switch (preset) {
    case "datetime":
      return `${time}, ${monthDay}`; // "4:16 PM, Jul 19"
    case "datetimeYear":
      return `${time}, ${dateWithYear}`; // "4:16 PM, Jul 19, 2026"
    case "date":
      return dateWithYear; // "Jul 19, 2026"
    case "dateShort":
      return monthDay; // "Jul 19"
    case "time":
      return time; // "4:16 PM"
    default:
      return fmt.format(date);
  }
}
