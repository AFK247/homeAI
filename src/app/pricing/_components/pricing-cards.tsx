"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CREDIT_PACKS,
  creditsForUsd,
  FREE_MODEL_COST,
  OPEN_TOPUP_MAX_USD,
  OPEN_TOPUP_MIN_USD,
  PREMIUM_MODEL_COST,
  SIGNUP_GRANT_CREDITS,
} from "@/config/credits";
import { PAGES } from "@/config/pages";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

/*
 * Pricing cards + open top-up (docs/CREDIT_SYSTEM.md §4). This page is USD-only and English-only
 * (international-first) — it deliberately does NOT use the i18n dict or ৳, so the language toggle
 * never turns it Bengali. A separate BD/taka pricing page can come later. Config-driven: pack
 * prices/credits come from CREDIT_PACKS, the top-up rate from creditsForUsd.
 *
 * Buy is stubbed until SSLCommerz lands (Phase 2): logged-out → /login; logged-in → a
 * "coming soon" toast. Swap the toast for the payment-init call when it's built.
 */

// Two packs shown as cards (Starter stays in config, reachable via open top-up).
const SHOWN_PACKS = ["popular", "pro"] as const;
const PACK_LABEL: Record<string, string> = { starter: "Starter", popular: "Popular", pro: "Pro" };
const PACK_FEATURES = [
  "All styles & rooms",
  "Premium AI model",
  "Save & share",
  "Credits never expire",
];
const FREE_FEATURES = ["Added when you sign up", PACK_FEATURES[0], PACK_FEATURES[1]] as string[];

const usd = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;

// "~N redesigns" estimate. Free credits run the free model (cheap), paid credits the premium
// model — so estimate each with the cost it can actually spend on. Uses bare cost NUMBERS from
// config (never model IDs — those are server-only).
const freeImagesFor = (credits: number) => Math.floor(credits / FREE_MODEL_COST);
const premiumImagesFor = (credits: number) => Math.floor(credits / PREMIUM_MODEL_COST);

export function PricingCards() {
  const { data: session } = useSession();
  const router = useRouter();

  const packs = SHOWN_PACKS.map((id) => CREDIT_PACKS.find((p) => p.id === id)).filter(
    (p): p is (typeof CREDIT_PACKS)[number] => Boolean(p),
  );

  function buy(_packId: string) {
    // Buying requires an account (credits attach to a user). Logged-out → login.
    if (!session?.user) {
      router.push(`${PAGES.LOGIN}?next=${PAGES.PRICING}`);
      return;
    }
    // TODO(payments): replace with the SSLCommerz init call for `_packId`.
    toast.info("Payments coming soon");
  }

  return (
    <>
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {/* Free — auto-granted on signup */}
        <Card>
          <CardHead
            name="Free"
            price="$0"
            sub={`${SIGNUP_GRANT_CREDITS} credits`}
            note={`~${freeImagesFor(SIGNUP_GRANT_CREDITS)} normal redesigns`}
          />
          <Features items={FREE_FEATURES} />
          <Button
            size="lg"
            variant="outline"
            className="mt-auto w-full"
            onClick={() => router.push(session?.user ? PAGES.CREATE.INDEX : PAGES.LOGIN)}
          >
            Get started
          </Button>
        </Card>

        {/* Config-driven packs */}
        {packs.map((pack) => {
          const highlight = "highlight" in pack && pack.highlight;
          return (
            <Card key={pack.id} highlight={highlight}>
              {highlight ? (
                <span className="-top-3 -translate-x-1/2 absolute left-1/2 rounded-full bg-primary px-3 py-1 font-bold text-[11px] text-primary-foreground">
                  Popular
                </span>
              ) : null}
              <CardHead
                name={PACK_LABEL[pack.id] ?? pack.id}
                price={usd(pack.priceUsd)}
                sub={`${pack.credits.toLocaleString()} credits`}
                note={`~${premiumImagesFor(pack.credits)} premium redesigns`}
              />
              <Features items={PACK_FEATURES} />
              <Button
                size="lg"
                variant={highlight ? "default" : "outline"}
                className="mt-auto w-full"
                onClick={() => buy(pack.id)}
              >
                Buy credits
              </Button>
            </Card>
          );
        })}

        {/* Enterprise — custom, contact us */}
        <Card>
          <div>
            <div className="font-bold text-foreground text-lg">Enterprise</div>
            <div className="mt-2 font-serif font-extrabold text-3xl text-foreground">Custom</div>
            <p className="mt-2 text-brand-body text-sm leading-relaxed">
              For high-volume credits or a custom plan, get in touch.
            </p>
          </div>
          <Features items={["Bulk credit discount", "Dedicated support", "Credits never expire"]} />
          <Button size="lg" variant="outline" className="mt-auto w-full" asChild>
            <a href="mailto:hello@homeai.com.bd">Contact us</a>
          </Button>
        </Card>
      </div>

      <OpenTopUp onBuy={() => buy("open-topup")} />
    </>
  );
}

// ── Open top-up ────────────────────────────────────────────────────────────
function OpenTopUp({ onBuy }: { onBuy: () => void }) {
  const [amount, setAmount] = useState("");
  const dollars = Number(amount) || 0;
  const credits = dollars >= OPEN_TOPUP_MIN_USD ? creditsForUsd(dollars) : 0;
  const valid = dollars >= OPEN_TOPUP_MIN_USD && dollars <= OPEN_TOPUP_MAX_USD;

  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-card p-6 text-left shadow-sm">
      <h2 className="font-serif font-bold text-foreground text-lg">Or enter any amount</h2>
      <p className="mt-1 text-brand-body text-sm">
        Any amount from ${OPEN_TOPUP_MIN_USD} — same great rate as the packs.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-40">
          <span className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground">$</span>
          <Input
            type="number"
            inputMode="numeric"
            min={OPEN_TOPUP_MIN_USD}
            max={OPEN_TOPUP_MAX_USD}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="amount"
            className="pl-7"
          />
        </div>
        <span className="text-brand-body text-sm">
          You get <span className="font-bold text-foreground">{credits.toLocaleString()}</span>{" "}
          credits
          {credits > 0 ? (
            <span className="text-brand-faint">
              {" "}
              · ~{premiumImagesFor(credits)} premium redesigns
            </span>
          ) : null}
        </span>
        <Button className="sm:ml-auto" disabled={!valid} onClick={onBuy}>
          Buy credits
        </Button>
      </div>
    </div>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────────
function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl bg-card p-7 text-left shadow-sm",
        highlight && "ring-2 ring-primary",
      )}
    >
      {children}
    </div>
  );
}

function CardHead({
  name,
  price,
  sub,
  note,
}: {
  name: string;
  price: string;
  sub: string;
  note?: string;
}) {
  return (
    <div>
      <div className="font-bold text-foreground text-lg">{name}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-serif font-extrabold text-3xl text-foreground">{price}</span>
        <span className="text-muted-foreground text-sm">{sub}</span>
      </div>
      {note ? <div className="mt-1 text-brand-faint text-xs">{note}</div> : null}
    </div>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((f) => (
        <li key={f} className="flex items-center gap-2 text-brand-body text-sm">
          <Check className="size-4 shrink-0 text-primary" /> {f}
        </li>
      ))}
    </ul>
  );
}
