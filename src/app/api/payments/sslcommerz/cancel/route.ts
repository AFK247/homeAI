import { NextResponse } from "next/server";
import { PAGES } from "@/config/pages";
import { PaymentService } from "@/server/service/payment/payment.service";
import { readCallback } from "../_shared";

/*
 * SSLCommerz CANCEL callback (browser redirect) — the user backed out at the gateway. Marks the
 * pending payment `cancelled` (no grant) and returns them to /pricing.
 */

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const cb = await readCallback(request);
  if (cb.tranId) await PaymentService.markFailed(cb.tranId, "cancelled");
  const url = new URL(PAGES.PAYMENT_RESULT, request.url);
  url.searchParams.set("status", "cancelled");
  if (cb.tranId) url.searchParams.set("tran_id", cb.tranId);
  return NextResponse.redirect(url, { status: 303 });
}

export const POST = handle;
export const GET = handle;
