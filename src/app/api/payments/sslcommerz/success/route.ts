import { NextResponse } from "next/server";
import { PAGES } from "@/config/pages";
import { logger } from "@/lib/logger";
import { confirmFromCallback, readCallback } from "../_shared";

/*
 * SSLCommerz SUCCESS callback (browser redirect, POST). We confirm server-to-server before
 * trusting it (the redirect alone is spoofable), then bounce the user back to /pricing with a
 * status flag. The authoritative grant may also come from the IPN — confirm() is idempotent, so
 * whichever fires first wins and the other no-ops.
 */

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const cb = await readCallback(request);
  let granted = false;
  try {
    granted = await confirmFromCallback(cb);
  } catch (err) {
    logger.error({ err, tranId: cb.tranId }, "SSLCommerz success confirm failed");
  }
  const url = new URL(PAGES.PAYMENT_RESULT, request.url);
  url.searchParams.set("status", granted ? "success" : "pending");
  if (cb.tranId) url.searchParams.set("tran_id", cb.tranId);
  return NextResponse.redirect(url, { status: 303 });
}

export const POST = handle;
export const GET = handle;
