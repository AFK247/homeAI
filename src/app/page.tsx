import Link from "next/link";
import { BeforeAfter } from "@/components/brand/before-after";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { toBnDigits } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";

const BRANDS = ["Hatil", "Otobi", "Regal", "Bikroy"];
export default async function LandingPage() {
  const { dict, locale } = await getDictionary();
  const steps = [
    { n: 1, title: dict.landing.step1Title, desc: dict.landing.step1Desc },
    { n: 2, title: dict.landing.step2Title, desc: dict.landing.step2Desc },
    { n: 3, title: dict.landing.step3Title, desc: dict.landing.step3Desc },
  ];
  const num = (n: number) => (locale === "bn" ? toBnDigits(n) : String(n));
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section
          id="examples"
          className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-2 md:py-16"
        >
          <div>
            <h1 className="font-serif font-extrabold text-4xl text-foreground leading-tight md:text-5xl">
              {dict.landing.heroTitle}
            </h1>
            <p className="mt-5 max-w-md text-brand-body text-lg leading-relaxed">
              {dict.landing.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button size="lg" asChild>
                <Link href="/create">{dict.landing.cta}</Link>
              </Button>
              <span className="font-semibold text-brand-gold text-sm">
                ✓ {num(5)}
                {dict.landing.freeBadge}
              </span>
            </div>
            <div className="mt-9 flex items-center gap-2.5">
              <span className="text-brand-faint text-xs">{dict.landing.furnitureLabel}</span>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((b) => (
                  <span
                    key={b}
                    className="rounded-full border border-border bg-card px-3 py-1 font-bold text-brand-body text-xs"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <BeforeAfter className="h-[380px]" />
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto grid max-w-6xl gap-5 px-6 pb-16 md:grid-cols-3 scroll-mt-24"
        >
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-card p-6 shadow-sm">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-secondary font-serif font-extrabold text-lg text-secondary-foreground">
                {num(s.n)}
              </div>
              <h3 className="font-serif font-bold text-foreground text-lg">{s.title}</h3>
              <p className="mt-1.5 text-brand-body text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
