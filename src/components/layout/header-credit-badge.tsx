import { CreditBadge } from "@/components/brand/credit-badge";
import { serverRpc } from "@/server/rpc/server";

/*
 * Server wrapper that fetches the caller's credit balance via serverRpc and renders the
 * (client) CreditBadge. Pages pass this into <SiteHeader rightSlot={…}> so the balance is
 * server-loaded per request — the app-wide convention (server reads → props), not client
 * fetching. Navigation / router.refresh() after a debit re-renders it with the new balance.
 */
export async function HeaderCreditBadge() {
  const credit = await serverRpc.credit.balance();
  return <CreditBadge credit={credit} />;
}
