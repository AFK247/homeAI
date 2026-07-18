import { type HTMLElement, parse } from "node-html-parser";

/*
 * Plain HTTP fetch + HTML parse — for SERVER-RENDERED vendor sites (Otobi, Navana, Hatim),
 * which return full product HTML without JavaScript. Much faster than the Playwright path
 * (browser.ts) used for JS-rendered vendors (Hatil, Brothers).
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Fetch a URL and return its parsed HTML root, or null on any failure. */
export async function fetchHtml(url: string): Promise<HTMLElement | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
    if (!res.ok) return null;
    return parse(await res.text());
  } catch {
    return null;
  }
}

/** Fetch and return raw text (for sitemaps/XML), or null. */
export async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
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
