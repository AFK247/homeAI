import { logger } from "@/lib/logger";
import { confirmFromCallback, readCallback } from "../_shared";

/*
 * SSLCommerz IPN (Instant Payment Notification) — the AUTHORITATIVE, server-to-server callback.
 * SSLCommerz posts here directly (not via the browser), so credits are granted even if the buyer
 * closes the tab before the success redirect. Same idempotent confirm() as the success route:
 * whichever commits first grants, the other no-ops. Always returns 200 so SSLCommerz stops
 * retrying once we've received it.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cb = await readCallback(request);
  try {
    const granted = await confirmFromCallback(cb);
    logger.info({ tranId: cb.tranId, granted }, "SSLCommerz IPN processed");
  } catch (err) {
    logger.error({ err, tranId: cb.tranId }, "SSLCommerz IPN confirm failed");
  }
  return new Response("OK", { status: 200 });
}
