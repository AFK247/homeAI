import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/config/pages";
import { getDictionary } from "@/lib/i18n/server";
import { serverRpc } from "@/server/rpc/server";
import { DesignsGrid } from "./_components/designs-grid";

/*
 * My Designs gallery. Server component reads the anon's designs directly through the design
 * router (serverRpc.design.list) and passes them to the client grid as a prop — the app-wide
 * oRPC convention (no queries.ts / QueryProvider).
 */

async function Content() {
  const designs = await serverRpc.design.list();
  return <DesignsGrid designs={designs} />;
}

export default async function DesignsPage() {
  const { dict } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="font-serif font-extrabold text-3xl text-foreground">
            {dict.designs.title}
          </h1>
          <Button asChild>
            <Link href={PAGES.CREATE.INDEX}>{dict.designs.newDesign}</Link>
          </Button>
        </div>
        <Suspense
          fallback={<p className="mt-16 text-center text-brand-body">{dict.common.loading}</p>}
        >
          <Content />
        </Suspense>
      </main>
    </>
  );
}
