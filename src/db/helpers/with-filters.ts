import "server-only";

import { and, asc, type Column, desc, eq, or, type SQL, sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { Paginated, SearchParams } from "./search-params";

/*
 * Backend search/filter/sort/pagination helpers (adapted from the reference
 * with-filters). Services compose these; the actual querying happens in the DB,
 * not the client.
 */

/** Combine conditions with AND, dropping undefined. */
export function andWhere(filters: (SQL | undefined)[]): SQL | undefined {
  const apply = filters.filter((f): f is SQL => Boolean(f));
  return apply.length ? and(...apply) : undefined;
}

/** Case-insensitive substring search over the given text columns. */
export function searchFilters(
  columns: PgColumn[],
  search: string | undefined | null,
): SQL | undefined {
  if (!search) return undefined;
  const term = `%${search}%`;
  // Cast to text so this works for enum columns too (ilike/~~* has no enum
  // operator — `design_style ~~* unknown` fails without the cast).
  const conditions = columns.map((col) => sql`${col}::text ilike ${term}`);
  return conditions.length ? or(...conditions) : undefined;
}

/** Equality filters: { columnName: value } → col = value, for the allowed map. */
export function equalFilters(
  columnMap: Record<string, PgColumn>,
  filters: Record<string, string> | undefined,
): SQL[] {
  if (!filters) return [];
  const out: SQL[] = [];
  for (const [key, value] of Object.entries(filters)) {
    const col = columnMap[key];
    if (col && value) out.push(eq(col, value));
  }
  return out;
}

/** ORDER BY from sort/order, falling back to a default column. */
export function withSorting(
  columnMap: Record<string, Column>,
  params: Pick<SearchParams, "sort" | "order">,
  fallback: Column,
): SQL {
  const col = (params.sort && columnMap[params.sort]) || fallback;
  return params.order === "asc" ? asc(col) : desc(col);
}

/**
 * Run a paginated fetch: a count query + a limit/offset data query, returning
 * the Paginated envelope. `build` receives (limit, offset) and returns the rows.
 */
export async function paginate<T>(
  params: Pick<SearchParams, "page" | "size">,
  countQuery: Promise<{ total: number }[]>,
  build: (limit: number, offset: number) => Promise<T[]>,
): Promise<Paginated<T>> {
  const { page, size } = params;
  const offset = (page - 1) * size;
  const [countRows, data] = await Promise.all([countQuery, build(size, offset)]);
  const total = countRows[0]?.total ?? 0;
  return { data, total, page, size, pageCount: Math.max(1, Math.ceil(total / size)) };
}

/** COUNT(*) select helper. */
export function sqlCount() {
  return { total: sql<number>`count(*)::int` };
}
