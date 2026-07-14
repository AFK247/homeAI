"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Global top loading bar (nprogress-style) for App Router navigations.
 *
 * How it works: any in-app navigation is triggered by either a <a>/<Link> click
 * or a history push (router.push/replace). We start the bar on those, then
 * COMPLETE it when the URL (pathname + query) actually changes — i.e. the new
 * route has committed. Zero dependencies; respects prefers-reduced-motion via CSS.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0); // 0 = hidden, 1..99 = animating, 100 = done
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const firstRender = useRef(true);

  // Start: trim toward ~90% while the next route loads.
  const start = useCallback(() => {
    if (timer.current) return; // already running
    setProgress(8);
    timer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p; // hold near the end until navigation commits
        // ease-out: slow down as it approaches 90
        return p + Math.max(0.5, (90 - p) * 0.08);
      });
    }, 120);
  }, []);

  // Finish: jump to 100, then fade out and reset.
  const done = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setProgress(100);
    window.setTimeout(() => setProgress(0), 250);
  }, []);

  // Detect navigation START from user intent: link clicks + browser back/forward.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        (target && target !== "_self") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      // External links → let the browser handle it, no in-app bar.
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same URL → no navigation.
        if (url.pathname === window.location.pathname && url.search === window.location.search) {
          return;
        }
      } catch {
        return;
      }
      start();
    }

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", start);

    // Also catch programmatic navigation (router.push/replace go through
    // history.pushState/replaceState in the App Router).
    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function patchedPush(...args) {
      start();
      return origPush.apply(this, args);
    };
    history.replaceState = function patchedReplace(...args) {
      start();
      return origReplace.apply(this, args);
    };

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", start);
      history.pushState = origPush;
      history.replaceState = origReplace;
    };
  }, [start]);

  // COMPLETE when the committed URL changes (skip the very first mount).
  // Both pathname AND searchParams are needed — either changing means the new
  // route has committed, which is exactly when we finish the bar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname/searchParams are the navigation signal.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    done();
  }, [pathname, searchParams, done]);

  const visible = progress > 0;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-100 h-0.5"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--color-primary,#1C4E3F)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
