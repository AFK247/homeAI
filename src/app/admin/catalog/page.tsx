import { redirect } from "next/navigation";
import { PAGES } from "@/config/pages";
import { isLocal } from "@/server/rpc/local-only";
import { serverRpc } from "@/server/rpc/server";

/*
 * Catalog overview route. The vendor cards live in the shared layout (tab bar), so this bare route
 * has nothing of its own — it auto-opens the FIRST vendor's page so you always land on a real
 * vendor view under the cards. (The layout renders the not-local / no-vendors states.)
 */
export default async function AdminCatalogPage() {
  if (!isLocal()) return null; // layout renders the "local only" notice

  const vendors = await serverRpc.catalog.vendors();
  const first = vendors[0];
  if (first) redirect(PAGES.ADMIN.CATALOG_VENDOR(first.slug));
  return null; // no vendors — layout shows the empty state
}
