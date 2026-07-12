import { Check } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { formatBdt, localeDigits } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/*
 * Pricing / credits (design). Free tier + two paid credit packs; bKash + Nagad
 * shown clearly. Consumer pricing is low/free by design (PROJECT_CONTEXT §10) —
 * monetize supply side later.
 */
export default async function PricingPage() {
  const { dict, locale } = await getDictionary();
  const num = (n: number) => localeDigits(n, locale);

  const plans = [
    {
      name: dict.pricing.freePlanName,
      price: 0,
      designs: 5,
      highlight: false,
      popular: false,
      features: [
        `${num(5)}${dict.pricing.freeFeature1Suffix}`,
        dict.pricing.starterFeature2,
        dict.pricing.starterFeature3,
      ],
      cta: dict.pricing.freeCta,
    },
    {
      name: dict.pricing.packName,
      price: 200,
      designs: 50,
      highlight: true,
      popular: true,
      features: [
        `${num(50)}${dict.pricing.packFeature1Suffix}`,
        dict.pricing.packFeature2,
        dict.pricing.packFeature3,
        dict.pricing.packFeature4,
      ],
      cta: dict.pricing.buyCta,
    },
    {
      name: dict.pricing.proName,
      price: 800,
      designs: 250,
      highlight: false,
      popular: false,
      features: [
        `${num(250)}${dict.pricing.packFeature1Suffix}`,
        dict.pricing.proFeature2,
        dict.pricing.proFeature3,
        dict.pricing.proFeature4,
      ],
      cta: dict.pricing.buyCta,
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-14 text-center">
        <h1 className="font-serif font-extrabold text-3xl text-foreground md:text-4xl">
          {dict.pricing.title}
        </h1>
        <p className="mt-2 text-brand-body">
          {dict.pricing.subtitlePrefix}
          {num(5)}
          {dict.pricing.subtitleSuffix}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col gap-5 rounded-2xl bg-card p-7 text-left shadow-sm",
                plan.highlight && "ring-2 ring-primary",
              )}
            >
              {plan.popular ? (
                <span className="-top-3 -translate-x-1/2 absolute left-1/2 rounded-full bg-primary px-3 py-1 font-bold text-[11px] text-primary-foreground">
                  {dict.pricing.popularBadge}
                </span>
              ) : null}
              <div>
                <div className="font-bold text-foreground text-lg">{plan.name}</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-serif font-extrabold text-3xl text-foreground">
                    {plan.price === 0 ? dict.pricing.free : formatBdt(plan.price, locale)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    / {num(plan.designs)}
                    {dict.pricing.packUnitSuffix}
                  </span>
                </div>
                {plan.price > 0 ? (
                  <div className="mt-1 text-brand-faint text-xs">
                    ~{formatBdt(plan.price / plan.designs, locale)} {dict.pricing.perDesignSuffix}
                  </div>
                ) : null}
              </div>
              <ul className="flex flex-col gap-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-brand-body text-sm">
                    <Check className="size-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                className="mt-auto w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-6 text-brand-faint text-xs">{dict.pricing.footer}</p>
      </main>
    </>
  );
}
