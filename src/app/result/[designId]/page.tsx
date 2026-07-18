import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HeaderCreditBadge } from "@/components/layout/header-credit-badge";
import { SiteHeader } from "@/components/layout/site-header";
import { getDictionary } from "@/lib/i18n/server";
import { serverRpc } from "@/server/rpc/server";
import { ResultContent } from "./_components/result-content";

/*
 * Step 4 — Result. Server component reads the anon-scoped design through the design router
 * (serverRpc.design.getById) and passes it to the client as a prop — the app-wide oRPC
 * convention (no queries.ts / QueryProvider). The credit badge is global (SiteHeader). 404s
 * on a missing design.
 */

async function Content({ designId }: { designId: string }) {
  const design = await serverRpc.design.getById({ id: designId });
  if (!design) notFound();

  return <ResultContent design={design} />;
}

export default async function ResultPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const { dict } = await getDictionary();

  return (
    <>
      <SiteHeader rightSlot={<HeaderCreditBadge />} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 md:px-10">
        <Suspense
          fallback={<div className="py-20 text-center text-brand-body">{dict.common.loading}</div>}
        >
          <Content designId={designId} />
        </Suspense>
      </main>
    </>
  );
}
