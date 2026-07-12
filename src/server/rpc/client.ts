"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { PAGES } from "@/config/pages";
import type { WebRouter } from "./router";

/*
 * rpc (plan §5.4) — HTTP client for 'use client' components. Talks to /api/rpc.
 * The anon cookie is sent automatically (same-origin), so calls are scoped.
 */

const link = new RPCLink({
  url: () =>
    typeof window !== "undefined" ? `${window.location.origin}${PAGES.API.RPC}` : PAGES.API.RPC,
});

export const rpc: RouterClient<WebRouter> = createORPCClient(link);
