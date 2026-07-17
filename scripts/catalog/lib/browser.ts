import { type Browser, chromium, type Page } from "playwright";

/**
 * Minimal Playwright wrapper — ONLY the Hatil adapter needs this (its pages are
 * JavaScript-rendered, so a plain fetch returns an empty loader shell). Brothers is
 * server-rendered and uses plain fetch instead, never touching this file.
 */

let browser: Browser | null = null;

/** Lazily launch a single shared headless Chromium. */
export async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

/**
 * Open `url`, wait for the page to settle (JS-rendered content), and hand the Page to
 * `fn`. The page is always closed afterwards, even on error.
 */
export async function withPage<T>(url: string, fn: (page: Page) => Promise<T>): Promise<T> {
  const b = await getBrowser();
  const page = await b.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  });
  try {
    // `domcontentloaded` (not `networkidle`) — we only read <h1> + og: meta tags, which
    // are in the initial HTML. This is much faster; networkidle waits for every image/
    // tracker to go quiet.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    return await fn(page);
  } finally {
    await page.close();
  }
}

/** Close the shared browser at the end of a run. */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
