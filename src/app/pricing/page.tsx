import { Suspense } from "react";
import { HeaderCreditBadge } from "@/components/layout/header-credit-badge";
import { SiteHeader } from "@/components/layout/site-header";
import { getDictionary } from "@/lib/i18n/server";
import { PricingCards } from "./_components/pricing-cards";

/*
 * Pricing / credits (docs/CREDIT_SYSTEM.md §4). TWO lanes, chosen by language with a ৳/$ toggle:
 * the BDT lane (SSLCommerz — bKash/Nagad/card) for Bangla, the USD lane for English. The heading
 * is localized here; the cards + open top-up render in the client PricingCards, which also reads
 * the ?payment= return status. Config-driven via CREDIT_PACKS / CREDIT_PACKS_BDT.
 */
export default async function PricingPage() {
  const { dict } = await getDictionary();
  const t = dict.pricing;
  return (
    <>
      <SiteHeader rightSlot={<HeaderCreditBadge />} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 text-center">
        <h1 className="font-serif font-extrabold text-3xl text-foreground md:text-4xl">
          {t.title}
        </h1>
        <p className="mt-2 text-brand-body">{t.subtitle}</p>

        {/* PricingCards uses useSearchParams (?payment=…) → needs a Suspense boundary. */}
        <Suspense>
          <PricingCards />
        </Suspense>

        <p className="mt-6 text-brand-faint text-xs">{t.secureNote}</p>
      </main>
    </>
  );
}
