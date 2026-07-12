"use client";

import { useEffect, useState } from "react";

/** SSR-safe media query hook. Returns false on the server / first paint. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** True at Tailwind's lg breakpoint (1024px) and up. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
