import { z } from "zod";

/*
 * Shared list search/filter/sort/pagination params (reference convention).
 * Parsed from the URL query string on the server and passed into paginated
 * services. Every list endpoint accepts this shape.
 */
export const searchParamsSchema = z.object({
  /** Free-text search over a service-defined set of columns. */
  search: z.string().trim().optional(),
  /** Column to sort by (service validates against allowed columns). */
  sort: z.string().optional(),
  /** Sort direction. */
  order: z.enum(["asc", "desc"]).default("desc"),
  /** 1-based page number. */
  page: z.coerce.number().int().min(1).default(1),
  /** Page size. */
  size: z.coerce.number().int().min(1).max(100).default(10),
  /** Equality filters (e.g. { status: "done" }). Extra keys are allowed. */
  filters: z.record(z.string(), z.string()).optional(),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/** Paginated response envelope returned by every getPaginated service. */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pageCount: number;
}

/**
 * The raw, unparsed URL query object a page/promises factory receives. Centralized
 * so it isn't re-declared inline everywhere. `parseListParams` turns it into typed
 * SearchParams.
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** A Next.js page's `searchParams` prop (async in the App Router). */
export type PageSearchParams = { searchParams: Promise<RawSearchParams> };

/**
 * Parse a Next.js page `searchParams` object into typed SearchParams.
 * Unknown scalar keys become equality `filters`.
 */
export function parseListParams(
  raw: RawSearchParams,
  opts?: { filterKeys?: string[] },
): SearchParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters: Record<string, string> = {};
  for (const key of opts?.filterKeys ?? []) {
    const val = first(raw[key]);
    if (val) filters[key] = val;
  }
  return searchParamsSchema.parse({
    search: first(raw.search),
    sort: first(raw.sort),
    order: first(raw.order),
    page: first(raw.page),
    size: first(raw.size),
    filters,
  });
}
