import { type Browser, chromium, type Page } from "playwright";
import { withRetry } from "./retry";

/**
 * Minimal Playwright wrapper for the JS-rendered vendors — Hatil (pages are JavaScript-rendered,
 * so a plain fetch returns an empty loader shell) and Brothers (bot-blocks raw GETs). The
 * fetch-based vendors (Otobi, Navana, Hatim) use http.ts instead and never touch this file.
 *
 * A single shared headless Chromium is launched lazily and reused. Page navigation retries with
 * backoff (a 20s timeout / flaky load is the single biggest Playwright reliability loss); the page
 * is always closed afterwards, even on error.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const NAV_TIMEOUT_MS = 20_000;

let browser: Browser | null = null;

/** Lazily launch a single shared headless Chromium. */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

/**
 * Open `url` (retried with backoff on nav failure), wait for the DOM to settle, and hand the Page
 * to `fn`. The page is always closed afterwards, even on error. A fresh page is opened per attempt
 * so a half-loaded page from a timed-out attempt never leaks into a retry.
 *
 * `domcontentloaded` (not `networkidle`) — we only read <h1> + og: meta, which are in the initial
 * HTML; this is much faster than waiting for every image/tracker to go quiet.
 */
export async function withPage<T>(
  url: string,
  fn: (page: Page) => Promise<T>,
  opts: { signal?: AbortSignal } = {},
): Promise<T> {
  const b = await getBrowser();
  return withRetry(
    async () => {
      const page = await b.newPage({ userAgent: UA });
      // Instant stop: closing the page CANCELS any in-flight goto()/fn() immediately (they reject),
      // so a Stop during a ~20s page load takes effect at once instead of waiting for the timeout.
      const onAbort = () => void page.close().catch(() => {});
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        return await fn(page);
      } finally {
        opts.signal?.removeEventListener("abort", onAbort);
        await page.close().catch(() => {});
      }
    },
    { signal: opts.signal },
  );
}

/** Close the shared browser at the end of a run. */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
