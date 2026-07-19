import "server-only";

import { z } from "zod";
import { env } from "@/lib/env";
import { protectedProcedure } from "@/server/rpc/procedures";
import { PaymentService } from "./payment.service";

/*
 * Payment router (docs/CREDIT_SYSTEM.md §4). Buying credits requires a logged-in user (credits
 * attach to a userId), so this is a protectedProcedure. `initiate` starts a SSLCommerz checkout
 * and returns the gateway URL — the client redirects the browser there. Fulfilment happens
 * server-side in the callback/IPN routes (PaymentService.confirm), never here.
 */

/** App public origin — where SSLCommerz posts its callbacks. Falls back to localhost in dev. */
function appBaseUrl() {
  return env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export const paymentRouter = {
  // Start a purchase for a pack id (either the USD or BDT lane — the service validates it and
  // resolves the taka amount). Returns the SSLCommerz gateway URL to redirect to.
  initiate: protectedProcedure
    .input(z.object({ packId: z.string().min(1) }))
    .handler(({ input, context }) =>
      PaymentService.create(context.user.id, input.packId, appBaseUrl()),
    ),

  // Open top-up: an arbitrary amount in the chosen currency. The server recomputes credits and
  // enforces bounds (getOpenTopupCharge), so the client can't buy credits for a bogus price.
  initiateTopup: protectedProcedure
    .input(z.object({ amount: z.number().positive(), currency: z.enum(["usd", "bdt"]) }))
    .handler(({ input, context }) =>
      PaymentService.createOpenTopup(context.user.id, input, appBaseUrl()),
    ),

  // Read one of the caller's own payments (for the result page). Scoped to the user in the
  // service, so a tran_id from another account returns null.
  byTranId: protectedProcedure
    .route({ method: "GET" })
    .input(z.object({ tranId: z.string().min(1) }))
    .handler(({ input, context }) => PaymentService.getByTranId(context.user.id, input.tranId)),
};
