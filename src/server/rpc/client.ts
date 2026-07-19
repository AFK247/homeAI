"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { PAGES } from "@/config/pages";
import { peekDeviceFingerprint } from "@/lib/fingerprint";
import type { WebRouter } from "./router";

/*
 * rpc (plan §5.4) — HTTP client for 'use client' components. Talks to /api/rpc.
 * The anon cookie is sent automatically (same-origin), so calls are scoped.
 *
 * Every request also carries the device fingerprint as `x-device-fingerprint` (abuse defense —
 * the server's rate-limit guards + credit anti-farming key on it). We read it synchronously via
 * peekDeviceFingerprint() so a call is NEVER blocked waiting on fingerprint computation; the app
 * warms it on mount (warmDeviceFingerprint), so it's usually ready by the first guarded call, and
 * if not the header is simply omitted and the server falls back to its ip/cookie key.
 */

const link = new RPCLink({
  url: () =>
    typeof window !== "undefined" ? `${window.location.origin}${PAGES.API.RPC}` : PAGES.API.RPC,
  headers: () => {
    const fp = peekDeviceFingerprint();
    return fp ? { "x-device-fingerprint": fp } : {};
  },
});

export const rpc: RouterClient<WebRouter> = createORPCClient(link);
