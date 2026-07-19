import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/*
 * SSLCommerz gateway wrapper (docs/CREDIT_SYSTEM.md §4). SSLCommerz is Bangladesh's payment
 * aggregator — ONE integration exposes bKash, Nagad, Rocket and all cards. There's no SDK worth
 * pulling in: the API is two plain form-POST/GET REST endpoints, so this is a thin typed fetch
 * wrapper. Sandbox vs live is chosen by SSLCOMMERZ_IS_LIVE.
 *
 *   initSession()    → creates a hosted-checkout session; returns the GatewayPageURL to redirect
 *                      the buyer to (where they pick bKash/Nagad/card and pay).
 *   validatePayment() → the SECURITY step: after the browser returns to our success URL (which is
 *                      spoofable), we call this server-to-server with the val_id to confirm the
 *                      REAL status + amount before granting any credits.
 *
 * All amounts are BDT (SSLCommerz settles taka to a Bangladeshi bank).
 */

const BASE = {
  live: "https://securepay.sslcommerz.com",
  sandbox: "https://sandbox.sslcommerz.com",
} as const;

function baseUrl() {
  return env.SSLCOMMERZ_IS_LIVE ? BASE.live : BASE.sandbox;
}

/** Store credentials — throws (not fail-open) because a purchase must never silently no-op. */
function credentials(): { store_id: string; store_passwd: string } {
  const store_id = env.SSLCOMMERZ_STORE_ID;
  const store_passwd = env.SSLCOMMERZ_STORE_PASSWORD;
  if (!store_id || !store_passwd) {
    throw new Error(
      "SSLCommerz is not configured (SSLCOMMERZ_STORE_ID / SSLCOMMERZ_STORE_PASSWORD). " +
        "Add sandbox credentials from sslcommerz.com to accept payments.",
    );
  }
  return { store_id, store_passwd };
}

export interface InitSessionInput {
  tranId: string;
  amountBdt: number;
  /** Credits being bought — passed through as product info + custom fields (echoed back). */
  credits: number;
  customer: { name: string; email: string };
  urls: { success: string; fail: string; cancel: string; ipn: string };
}

/**
 * Create a hosted checkout session. On success SSLCommerz returns `GatewayPageURL` — redirect the
 * browser there. `tran_id` is our own unique id (the `payments.tranId`), echoed back on every
 * callback so we can reconcile. We stash `credits`/`tranId` in custom fields too (defence in depth).
 */
export async function initSession(input: InitSessionInput): Promise<{ gatewayUrl: string }> {
  const { store_id, store_passwd } = credentials();
  const body = new URLSearchParams({
    store_id,
    store_passwd,
    total_amount: input.amountBdt.toFixed(2),
    currency: "BDT",
    tran_id: input.tranId,
    success_url: input.urls.success,
    fail_url: input.urls.fail,
    cancel_url: input.urls.cancel,
    ipn_url: input.urls.ipn,
    // Product info (required by the API).
    product_name: `${input.credits} Home AI credits`,
    product_category: "digital",
    product_profile: "non-physical-goods",
    // Customer (required fields; SSLCommerz validates presence, not accuracy).
    cus_name: input.customer.name || "Home AI user",
    cus_email: input.customer.email,
    cus_phone: "N/A",
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    // Custom passthrough — echoed back on callbacks; we still re-derive from the DB row, never
    // trust these blindly, but they help reconcile.
    value_a: input.tranId,
    value_b: String(input.credits),
  });

  const res = await fetch(`${baseUrl()}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`SSLCommerz init failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    status?: string;
    failedreason?: string;
    GatewayPageURL?: string;
  };
  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    logger.error({ status: data.status, reason: data.failedreason }, "SSLCommerz init rejected");
    throw new Error(`SSLCommerz init rejected: ${data.failedreason ?? data.status ?? "unknown"}`);
  }
  return { gatewayUrl: data.GatewayPageURL };
}

export interface ValidationResult {
  /** VALID / VALIDATED means paid; anything else (FAILED / INVALID_TRANSACTION) is not. */
  valid: boolean;
  status: string;
  tranId: string | null;
  amountBdt: number | null;
}

/**
 * Server-to-server validation (§4 security gate). Given the `val_id` SSLCommerz sends on the
 * success callback / IPN, confirm the transaction really settled and read back the authoritative
 * amount + tran_id. Callers MUST compare `amountBdt`/`tranId` against the pending `payments` row
 * before granting credits — this call proves the payment is real; the DB row proves how much was
 * owed. On any network/parse error we return `valid: false` (deny — never grant on uncertainty).
 */
export async function validatePayment(valId: string): Promise<ValidationResult> {
  const { store_id, store_passwd } = credentials();
  const url = new URL(`${baseUrl()}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", store_id);
  url.searchParams.set("store_passwd", store_passwd);
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok)
      return { valid: false, status: `HTTP ${res.status}`, tranId: null, amountBdt: null };
    const data = (await res.json()) as {
      status?: string;
      tran_id?: string;
      amount?: string;
      currency?: string;
    };
    const status = data.status ?? "UNKNOWN";
    const valid = status === "VALID" || status === "VALIDATED";
    return {
      valid,
      status,
      tranId: data.tran_id ?? null,
      amountBdt: data.amount ? Number(data.amount) : null,
    };
  } catch (err) {
    logger.error({ err }, "SSLCommerz validation call failed");
    return { valid: false, status: "ERROR", tranId: null, amountBdt: null };
  }
}
