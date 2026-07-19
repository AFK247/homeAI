import { NextResponse } from "next/server";
import { PAGES } from "@/config/pages";
import { PaymentService } from "@/server/service/payment/payment.service";
import { readCallback } from "../_shared";

/*
 * SSLCommerz FAIL callback (browser redirect). Marks the pending payment `failed` (no grant) and
 * returns the user to /pricing with a failure flag.
 */

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const cb = await readCallback(request);
  if (cb.tranId) await PaymentService.markFailed(cb.tranId, "failed");
  const url = new URL(PAGES.PAYMENT_RESULT, request.url);
  url.searchParams.set("status", "failed");
  if (cb.tranId) url.searchParams.set("tran_id", cb.tranId);
  return NextResponse.redirect(url, { status: 303 });
}

export const POST = handle;
export const GET = handle;
