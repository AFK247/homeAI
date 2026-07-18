import { HeaderCreditBadge } from "@/components/layout/header-credit-badge";
import { SiteHeader } from "@/components/layout/site-header";
import { PricingCards } from "./_components/pricing-cards";

/*
 * Pricing / credits (docs/CREDIT_SYSTEM.md §4). USD-ONLY, English-only (international-first) — it
 * intentionally does not use the i18n dict, so the language toggle never turns it Bengali. A
 * separate BD/taka pricing page can come later. Free (auto-granted on signup) + two credit packs
 * + Enterprise, then an open "enter any amount" top-up. Config-driven via CREDIT_PACKS. Card
 * checkout is wired in the client PricingCards (payment init is Phase 2).
 */
export default function PricingPage() {
  return (
    <>
      <SiteHeader rightSlot={<HeaderCreditBadge />} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14 text-center">
        <h1 className="font-serif font-extrabold text-3xl text-foreground md:text-4xl">
          Simple, affordable credits
        </h1>
        <p className="mt-2 text-brand-body">
          Sign up for free credits. Buy more any time — they never expire.
        </p>

        <PricingCards />

        <p className="mt-6 text-brand-faint text-xs">Secure payment via card, bKash & Nagad.</p>
      </main>
    </>
  );
}
