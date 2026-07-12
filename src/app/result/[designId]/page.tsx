import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { designQueries } from "@/app/create/_modules/design.queries";
import { designDetailPromises } from "@/app/create/_modules/promises";
import { CreditBadge } from "@/components/brand/credit-badge";
import { SiteHeader } from "@/components/layout/site-header";
import { getDictionary } from "@/lib/i18n/server";
import { mockCreditState } from "@/lib/mock-data";
import { QueryProvider } from "@/providers/query.provider";
import { ResultContent } from "./_components/result-content";

/*
 * Step 4 — Result. Follows the reference server-loading pattern:
 *   page → <Suspense> → async Content → designDetailPromises → <QueryProvider>
 *        → <ResultContent> (client, reads useDataProvider).
 * Anonymous-scoped: the anon cookie is read here and passed into the promises.
 */
const ANON_COOKIE = "anon_id";

async function Content({ designId }: { designId: string }) {
  const store = await cookies();
  const anonymousId = store.get(ANON_COOKIE)?.value ?? "";

  // Server-authoritative 404: a missing design returns a real HTTP 404 rather
  // than streaming a 200 shell. Cheap — the row is needed by the page anyway.
  const exists = await designQueries.getById({ id: designId, anonymousId });
  if (!exists) notFound();

  const promises = designDetailPromises(designId, anonymousId);

  return (
    <QueryProvider promises={promises}>
      <ResultContent />
    </QueryProvider>
  );
}

export default async function ResultPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const { dict } = await getDictionary();

  return (
    <>
      <SiteHeader rightSlot={<CreditBadge credit={mockCreditState} />} />
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
