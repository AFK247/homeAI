import { type HTMLElement, parse } from "node-html-parser";
import { withRetry } from "./retry";

/*
 * Plain HTTP fetch + HTML parse — for SERVER-RENDERED vendor sites (Otobi, Navana, Hatim),
 * which return full product HTML without JavaScript. Much faster than the Playwright path
 * (browser.ts) used for JS-rendered vendors (Hatil, Brothers).
 *
 * Every fetch retries with backoff (transient failures are the #1 reliability loss) and, on final
 * failure, throws an Error carrying the REAL reason (status code / message) — so callers can
 * surface "HTTP 503" or "timeout", not a generic "no product parsed". The null-returning wrappers
 * (fetchHtml/fetchText) catch for callers that prefer that; the throwing variants let a caller
 * propagate the real error to onFailed.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const TIMEOUT_MS = 20_000;

async function rawFetch(url: string, accept?: string): Promise<string> {
  const res = await fetch(url, {
    headers: accept ? { "user-agent": UA, accept } : { "user-agent": UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
  return res.text();
}

/** Fetch a URL and return its parsed HTML root. THROWS the real error (with status) on failure. */
export async function fetchHtmlOrThrow(url: string): Promise<HTMLElement> {
  const html = await withRetry(() => rawFetch(url, "text/html"));
  return parse(html);
}

/** Fetch a URL and return its parsed HTML root, or null on failure (retried first). */
export async function fetchHtml(url: string): Promise<HTMLElement | null> {
  try {
    return await fetchHtmlOrThrow(url);
  } catch {
    return null;
  }
}

/** Fetch and return raw text (for sitemaps/XML). THROWS the real error on failure. */
export async function fetchTextOrThrow(url: string): Promise<string> {
  return withRetry(() => rawFetch(url));
}

/** Fetch and return raw text, or null on failure (retried first). */
export async function fetchText(url: string): Promise<string | null> {
  try {
    return await fetchTextOrThrow(url);
  } catch {
    return null;
  }
}

/** Fetch JSON with retry. THROWS the real error (status / parse) on failure — for API vendors. */
export async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  const text = await withRetry(() => rawFetch(url, "application/json"));
  return JSON.parse(text) as T;
}

/** Parse "৳ 47,000" / "47,000.00 Tk." / "BDT 3,73,000" → 47000. Handles both grouping styles. */
export function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m?.[1] ? Math.round(Number.parseFloat(m[1])) : null;
}

/** Extract all <loc> URLs from sitemap XML (handles optional namespace prefixes). */
export function sitemapLocs(xml: string): string[] {
  return [...xml.matchAll(/<(?:\w+:)?loc>([^<]+)<\/(?:\w+:)?loc>/g)].map((m) => (m[1] ?? "").trim());
}
