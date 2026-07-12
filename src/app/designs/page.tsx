import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { designListPromises } from "@/app/create/_modules/promises";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/server";
import { QueryProvider } from "@/providers/query.provider";
import { DesignsGrid } from "./_components/designs-grid";

/*
 * My Designs gallery. Follows the reference server-loading pattern:
 *   page → <Suspense> → async Content → designListPromises → <QueryProvider>
 *        → <DesignsGrid> (client, useDataProvider). Anonymous-scoped.
 */
const ANON_COOKIE = "anon_id";

async function Content() {
  const store = await cookies();
  const anonymousId = store.get(ANON_COOKIE)?.value ?? "";
  const promises = designListPromises(anonymousId);

  return (
    <QueryProvider promises={promises}>
      <DesignsGrid />
    </QueryProvider>
  );
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
            <Link href="/create">{dict.designs.newDesign}</Link>
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
