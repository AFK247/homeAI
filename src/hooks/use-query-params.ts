"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useTransition } from "react";

/*
 * URL query-param state (reference convention). Search/filter/pagination live in
 * the URL (shareable, back-button friendly); reading them server-side triggers
 * the backend query.
 *
 * - updateParams / removeParams are STABLE (read pathname/params from refs) so a
 *   caller listing them in a useEffect dep array never loops.
 * - isPending is true while a param change (and its server re-query) is in
 *   flight, so lists can show a loading state.
 */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const queryParams = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const updateParams = useCallback(
    (
      updates: Record<string, string | number | null | undefined>,
      opts?: { resetPage?: boolean },
    ) => {
      const next = new URLSearchParams(searchParamsRef.current.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (opts?.resetPage !== false && !("page" in updates)) next.delete("page");
      startTransition(() => {
        router.replace(`${pathnameRef.current}?${next.toString()}`, { scroll: false });
      });
    },
    [router],
  );

  const removeParams = useCallback(
    (keys: string | string[]) => {
      const next = new URLSearchParams(searchParamsRef.current.toString());
      for (const key of Array.isArray(keys) ? keys : [keys]) next.delete(key);
      startTransition(() => {
        router.replace(`${pathnameRef.current}?${next.toString()}`, { scroll: false });
      });
    },
    [router],
  );

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return { queryParams, updateParams, removeParams, refresh, isPending };
}
