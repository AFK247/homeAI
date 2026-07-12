import { Check } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { formatBdt, toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
 * Pricing / credits (design). Free tier vs paid packs; bKash + Nagad shown clearly.
 * Consumer pricing is low/free by design (PROJECT_CONTEXT §10) — monetize supply side later.
 */
const PLANS = [
  {
    name: "ফ্রি",
    price: 0,
    highlight: false,
    features: [`${toBnDigits(5)}টি ফ্রি ডিজাইন`, "সব স্টাইল", "আসবাবের দাম দেখুন"],
    cta: "শুরু করুন",
  },
  {
    name: "ক্রেডিট প্যাক",
    price: 200,
    unit: `${toBnDigits(50)}টি ডিজাইন`,
    highlight: true,
    features: [`${toBnDigits(50)}টি ডিজাইন`, "হাই-রেজ আউটপুট", "প্রিমিয়াম স্টাইল", "সংরক্ষণ ও শেয়ার"],
    cta: "bKash / Nagad দিয়ে কিনুন",
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 text-center">
        <h1 className="font-serif font-extrabold text-3xl text-foreground md:text-4xl">
          সহজ ও সাশ্রয়ী দাম
        </h1>
        <p className="mt-2 text-brand-body">প্রথম {toBnDigits(5)}টি ডিজাইন একদম ফ্রি। কার্ড লাগবে না।</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "flex flex-col gap-5 rounded-2xl bg-card p-7 text-left shadow-sm",
                plan.highlight && "ring-2 ring-primary",
              )}
            >
              <div>
                <div className="font-bold text-foreground text-lg">{plan.name}</div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-serif font-extrabold text-3xl text-foreground">
                    {plan.price === 0 ? "ফ্রি" : formatBdt(plan.price)}
                  </span>
                  {plan.unit ? (
                    <span className="text-muted-foreground text-sm">/ {plan.unit}</span>
                  ) : null}
                </div>
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
        <p className="mt-6 text-brand-faint text-xs">
          পেমেন্ট: bKash · Nagad · কার্ড — SSLCommerz এর মাধ্যমে নিরাপদ।
        </p>
      </main>
    </>
  );
}
