/*
 * Client device fingerprint (abuse defense). A stable per-device hash from ThumbmarkJS — hashes
 * local browser signals only, no server calls, no PII sent anywhere. The server's rate-limit
 * guards + credit anti-farming key on it (composite: cookie OR ip OR fingerprint), so clearing
 * cookies / opening incognito on the SAME device still resolves to the same fingerprint and can't
 * farm fresh free credits. It's a deterrent for human farmers, not a wall against scripted bots
 * (those send no fingerprint → guards fall back to the ip/cookie key).
 *
 * Sent as the `x-device-fingerprint` header on every rpc call (see server/rpc/client.ts). This is
 * client-only: it must never run on the server (needs `window`).
 */

const STORAGE_KEY = "hai_device_fp";

// In-memory cache for the current tab — computed at most once per load.
let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

/** Read a previously-persisted fingerprint (survives reloads / new visits on the same device). */
function readPersisted(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode / disabled) — fall through to compute
  }
}

function persist(value: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // best-effort; a device that blocks storage still gets a stable in-memory value per load
  }
}

/**
 * Resolve the device fingerprint, computing + persisting it once. Returns null (never throws) if
 * the environment can't produce one (SSR, blocked APIs, library error), so callers can safely
 * omit the header — the server just falls back to its ip/cookie key.
 *
 * Order: in-memory cache → localStorage → compute via ThumbmarkJS → persist.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (cached) return cached;

  const stored = readPersisted();
  if (stored) {
    cached = stored;
    return stored;
  }

  // Dedupe concurrent callers onto one computation.
  if (!inFlight) {
    inFlight = (async () => {
      try {
        // Dynamic import keeps ThumbmarkJS out of the server bundle + off the initial critical path.
        const { getThumbmark } = await import("@thumbmarkjs/thumbmarkjs");
        const { thumbmark } = await getThumbmark();
        if (thumbmark) {
          cached = thumbmark;
          persist(thumbmark);
          return thumbmark;
        }
        return null;
      } catch {
        return null;
      } finally {
        inFlight = null;
      }
    })();
  }
  return inFlight;
}

/**
 * Best-effort synchronous read — returns the already-resolved fingerprint if available, else null.
 * Used by the rpc header injector so a call is never blocked waiting on fingerprint computation;
 * `warmDeviceFingerprint()` runs on app mount so it's usually ready by the first guarded call.
 */
export function peekDeviceFingerprint(): string | null {
  if (cached) return cached;
  const stored = typeof window !== "undefined" ? readPersisted() : null;
  if (stored) cached = stored;
  return cached;
}

/** Fire-and-forget warm-up: start computing the fingerprint so it's ready before it's needed. */
export function warmDeviceFingerprint(): void {
  void getDeviceFingerprint();
}
