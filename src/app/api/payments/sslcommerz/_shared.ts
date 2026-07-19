import { PaymentService } from "@/server/service/payment/payment.service";

/*
 * Shared parsing for the SSLCommerz callback routes. SSLCommerz posts
 * `application/x-www-form-urlencoded` bodies (val_id, tran_id, status, amount, …) to our
 * success/fail/cancel/IPN URLs. This reads those fields from either the POST body or the query
 * string (SSLCommerz uses POST, but being lenient makes local testing with a browser easy).
 */

export interface SslcommerzCallback {
  valId: string | null;
  tranId: string | null;
  status: string | null;
  amount: string | null;
}

export async function readCallback(request: Request): Promise<SslcommerzCallback> {
  const fields = new Map<string, string>();
  // Query string first (GET-style / manual testing).
  for (const [k, v] of new URL(request.url).searchParams) fields.set(k, v);
  // Then the form body (the real SSLCommerz POST) — overrides query on conflict.
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      for (const [k, v] of form) if (typeof v === "string") fields.set(k, v);
    } catch {
      // no/invalid body — fall back to whatever the query had
    }
  }
  return {
    valId: fields.get("val_id") ?? null,
    tranId: fields.get("tran_id") ?? null,
    status: fields.get("status") ?? null,
    amount: fields.get("amount") ?? null,
  };
}

/** Confirm + grant if we have both ids. Returns whether credits were granted. */
export async function confirmFromCallback(cb: SslcommerzCallback): Promise<boolean> {
  if (!cb.valId || !cb.tranId) return false;
  const { granted } = await PaymentService.confirm(cb.valId, cb.tranId);
  return granted;
}
