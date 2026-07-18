import "server-only";

import { publicProcedure } from "@/server/rpc/procedures";
import { CreditService, type Owner } from "./credit.service";

/*
 * Credit router (docs/CREDIT_SYSTEM.md). Read-only surface for the client/header — the balance
 * shown in the CreditBadge. Scoped to the caller (userId when logged in, else anonymousId), so
 * a session can only ever see its own credits. Grants/debits happen server-side in the generate
 * flow + auth hooks, not here.
 */
function ownerFrom(context: { anonymousId: string; user: { id: string } | null }): Owner {
  return context.user?.id ? { userId: context.user.id } : { anonymousId: context.anonymousId };
}

export const creditRouter = {
  // The caller's free/paid balances. Missing account → zeros (a fresh visitor pre-grant).
  balance: publicProcedure
    .route({ method: "GET" })
    .handler(({ context }) => CreditService.getBalance(ownerFrom(context))),
};
