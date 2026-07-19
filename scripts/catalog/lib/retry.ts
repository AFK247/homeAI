/*
 * Bounded retry with exponential backoff — shared by the fetch (http.ts) and Playwright
 * (browser.ts) paths. Transient failures (a flaky TCP reset, a 20s Playwright timeout, a 503)
 * are the single biggest reliability loss in scraping, so every network hop routes through this.
 *
 * `withRetry` returns the successful value or re-throws the LAST error after exhausting attempts.
 * Callers that want "null on failure" wrap it in a try/catch (see http.ts). Honors an AbortSignal
 * so the operator's Stop takes effect promptly, even mid-backoff.
 */

export interface RetryOptions {
  /** Total attempts (default 3 → 1 try + 2 retries). */
  attempts?: number;
  /** Base backoff in ms; doubles each retry (default 400 → 400, 800, …). */
  baseDelayMs?: number;
  /** Abort mid-retry (checked before each attempt + during backoff). */
  signal?: AbortSignal;
  /** Called before each retry (not the first attempt) — for logging/telemetry. */
  onRetry?: (attempt: number, error: unknown) => void;
}

export class AbortError extends Error {
  constructor() {
    super("aborted");
    this.name = "AbortError";
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError());
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new AbortError());
      },
      { once: true },
    );
  });
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (opts.signal?.aborted) throw new AbortError();
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof AbortError) throw err; // never retry a deliberate abort
      if (attempt < attempts) {
        opts.onRetry?.(attempt, err);
        await sleep(base * 2 ** (attempt - 1), opts.signal); // 400, 800, 1600, …
      }
    }
  }
  throw lastError;
}
