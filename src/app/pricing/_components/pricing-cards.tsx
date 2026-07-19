"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CREDIT_PACKS,
  CREDIT_PACKS_BDT,
  creditsForBdt,
  creditsForUsd,
  FREE_MODEL_COST,
  OPEN_TOPUP_MAX_BDT,
  OPEN_TOPUP_MAX_USD,
  OPEN_TOPUP_MIN_BDT,
  OPEN_TOPUP_MIN_USD,
  PREMIUM_MODEL_COST,
  SHOWN_BDT_PACKS,
  SIGNUP_GRANT_CREDITS,
} from "@/config/credits";
import { PAGES } from "@/config/pages";
import { useSession } from "@/lib/auth/client";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { handleORPCError } from "@/lib/utils/error";
import { rpc } from "@/server/rpc/client";

/*
 * Pricing cards + open top-up (docs/CREDIT_SYSTEM.md §4). TWO lanes:
 *   - BDT lane (৳): native taka packs, SSLCommerz (bKash/Nagad/card). Copy from the i18n dict.
 *   - USD lane ($): the original international packs. Inline English copy.
 * The lane defaults to the active language (Bangla → ৳, English → $) but a ৳/$ toggle lets the
 * user override. The chosen lane is stored in the URL (?lane=bdt|usd) so it survives a refresh /
 * share. Buying redirects to the SSLCommerz gateway via rpc.payment.initiate; the open top-up
 * stays USD-only for now (BD top-up is a follow-up). The payment RESULT is shown on its own
 * /payment/result page (not here).
 */

const usd = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;
const bdt = (n: number) => `৳${n.toLocaleString("en-US")}`;

// "~N redesigns" estimate — free credits run the free model (cheap), paid credits the premium
// model. Uses bare cost NUMBERS from config (never model IDs — those are server-only).
const freeImagesFor = (credits: number) => Math.floor(credits / FREE_MODEL_COST);
const premiumImagesFor = (credits: number) => Math.floor(credits / PREMIUM_MODEL_COST);

type Lane = "bdt" | "usd";

export function PricingCards() {
  const { data: session } = useSession();
  const { locale, dict } = useTranslation();
  const t = dict.pricing;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [buying, startBuy] = useTransition();

  // Lane is URL-backed (?lane=…) so it survives a refresh; falls back to the active language.
  const laneParam = params.get("lane");
  const lane: Lane =
    laneParam === "bdt" || laneParam === "usd" ? laneParam : locale === "bn" ? "bdt" : "usd";

  function setLane(next: Lane) {
    const q = new URLSearchParams(params);
    q.set("lane", next);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  }

  function buy(packId: string) {
    if (!session?.user) {
      // Preserve the chosen lane so they return to the same currency after logging in.
      const next = encodeURIComponent(`${PAGES.PRICING}?lane=${lane}`);
      router.push(`${PAGES.LOGIN}?next=${next}`);
      return;
    }
    startBuy(async () => {
      try {
        const { gatewayUrl } = await rpc.payment.initiate({ packId });
        window.location.href = gatewayUrl; // hand off to SSLCommerz hosted checkout
      } catch (err) {
        handleORPCError(err);
      }
    });
  }

  // Open top-up: an arbitrary amount in the active lane's currency. Same login gate as buy().
  function topup(amount: number) {
    if (!session?.user) {
      const next = encodeURIComponent(`${PAGES.PRICING}?lane=${lane}`);
      router.push(`${PAGES.LOGIN}?next=${next}`);
      return;
    }
    startBuy(async () => {
      try {
        const currency = lane === "bdt" ? "bdt" : "usd";
        const { gatewayUrl } = await rpc.payment.initiateTopup({ amount, currency });
        window.location.href = gatewayUrl;
      } catch (err) {
        handleORPCError(err);
      }
    });
  }

  return (
    <>
      <LaneToggle lane={lane} onChange={setLane} />

      {lane === "bdt" ? (
        <BdtCards t={t} buying={buying} onBuy={buy} onFree={goFree} />
      ) : (
        <UsdCards buying={buying} onBuy={buy} onFree={goFree} />
      )}

      {/* Open top-up — "enter any amount" in the active lane's currency. */}
      <OpenTopUp lane={lane} t={t} buying={buying} onBuy={topup} />
    </>
  );

  function goFree() {
    router.push(session?.user ? PAGES.CREATE.INDEX : PAGES.LOGIN);
  }
}

// ── Lane toggle (৳ / $) ──────────────────────────────────────────────────────
function LaneToggle({ lane, onChange }: { lane: Lane; onChange: (l: Lane) => void }) {
  return (
    <div className="mt-8 inline-flex rounded-full border border-border bg-card p-1 text-sm">
      {(["bdt", "usd"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            "rounded-full px-4 py-1.5 font-semibold transition-colors",
            lane === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {l === "bdt" ? "৳ Taka" : "$ USD"}
        </button>
      ))}
    </div>
  );
}

// ── BDT lane (Bangla-localized) ──────────────────────────────────────────────
type Pricing = ReturnType<typeof useTranslation>["dict"]["pricing"];

function BdtCards({
  t,
  buying,
  onBuy,
  onFree,
}: {
  t: Pricing;
  buying: boolean;
  onBuy: (id: string) => void;
  onFree: () => void;
}) {
  const perks = [t.perkAllStyles, t.perkPremium, t.perkSaveShare, t.perkNeverExpire];
  const nameFor: Record<string, string> = { "bd-popular": t.popularName, "bd-pro": t.proName };
  // Show only the two higher packs as cards (Free + 2 packs + Enterprise = 4), identical to the
  // USD lane's card count.
  const packs = SHOWN_BDT_PACKS.map((id) => CREDIT_PACKS_BDT.find((p) => p.id === id)).filter(
    (p): p is (typeof CREDIT_PACKS_BDT)[number] => Boolean(p),
  );
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {/* Free */}
      <Card>
        <CardHead
          name={t.freeName}
          price="৳0"
          sub={`${SIGNUP_GRANT_CREDITS.toLocaleString("en-US")}${t.creditsSuffix}`}
          note={`~${freeImagesFor(SIGNUP_GRANT_CREDITS)}${t.normalRedesigns}`}
        />
        <Features items={[t.freeGranted, t.perkAllStyles, t.perkPremium]} />
        <Button size="lg" variant="outline" className="mt-auto w-full" onClick={onFree}>
          {t.getStarted}
        </Button>
      </Card>

      {packs.map((pack) => (
        <Card key={pack.id} highlight={pack.highlight}>
          {pack.highlight ? (
            <span className="-top-3 -translate-x-1/2 absolute left-1/2 rounded-full bg-primary px-3 py-1 font-bold text-[11px] text-primary-foreground">
              {t.popularBadge}
            </span>
          ) : null}
          <CardHead
            name={nameFor[pack.id] ?? pack.id}
            price={bdt(pack.priceBdt)}
            sub={`${pack.credits.toLocaleString("en-US")}${t.creditsSuffix}`}
            note={`~${premiumImagesFor(pack.credits)}${t.premiumRedesigns}`}
          />
          <Features items={perks} />
          <Button
            size="lg"
            variant={pack.highlight ? "default" : "outline"}
            className="mt-auto w-full"
            disabled={buying}
            onClick={() => onBuy(pack.id)}
          >
            {buying ? t.processing : t.buy}
          </Button>
        </Card>
      ))}

      {/* Enterprise */}
      <Card>
        <div>
          <div className="font-bold text-foreground text-lg">{t.enterpriseName}</div>
          <div className="mt-2 font-serif font-extrabold text-3xl text-foreground">
            {t.enterprisePrice}
          </div>
          <p className="mt-2 text-brand-body text-sm leading-relaxed">{t.enterpriseBody}</p>
        </div>
        <Features items={[t.enterprisePerks]} />
        <Button size="lg" variant="outline" className="mt-auto w-full" asChild>
          <a href="mailto:hello@homeai.com.bd">{t.contact}</a>
        </Button>
      </Card>
    </div>
  );
}

// ── USD lane (original international copy) ────────────────────────────────────
const SHOWN_USD_PACKS = ["popular", "pro"] as const;
const USD_LABEL: Record<string, string> = { starter: "Starter", popular: "Popular", pro: "Pro" };
const USD_PERKS = [
  "All styles & rooms",
  "Premium AI model",
  "Save & share",
  "Credits never expire",
];

function UsdCards({
  buying,
  onBuy,
  onFree,
}: {
  buying: boolean;
  onBuy: (id: string) => void;
  onFree: () => void;
}) {
  const packs = SHOWN_USD_PACKS.map((id) => CREDIT_PACKS.find((p) => p.id === id)).filter(
    (p): p is (typeof CREDIT_PACKS)[number] => Boolean(p),
  );
  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHead
          name="Free"
          price="$0"
          sub={`${SIGNUP_GRANT_CREDITS} credits`}
          note={`~${freeImagesFor(SIGNUP_GRANT_CREDITS)} normal redesigns`}
        />
        <Features items={["Added when you sign up", USD_PERKS[0] ?? "", USD_PERKS[1] ?? ""]} />
        <Button size="lg" variant="outline" className="mt-auto w-full" onClick={onFree}>
          Get started
        </Button>
      </Card>

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
              name={USD_LABEL[pack.id] ?? pack.id}
              price={usd(pack.priceUsd)}
              sub={`${pack.credits.toLocaleString()} credits`}
              note={`~${premiumImagesFor(pack.credits)} premium redesigns`}
            />
            <Features items={USD_PERKS} />
            <Button
              size="lg"
              variant={highlight ? "default" : "outline"}
              className="mt-auto w-full"
              disabled={buying}
              onClick={() => onBuy(pack.id)}
            >
              {buying ? "Processing…" : "Buy credits"}
            </Button>
          </Card>
        );
      })}

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
  );
}

// ── Open top-up (currency-aware) ─────────────────────────────────────────────
function OpenTopUp({
  lane,
  t,
  buying,
  onBuy,
}: {
  lane: Lane;
  t: Pricing;
  buying: boolean;
  onBuy: (amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const n = Number(amount) || 0;

  const isBdt = lane === "bdt";
  const min = isBdt ? OPEN_TOPUP_MIN_BDT : OPEN_TOPUP_MIN_USD;
  const max = isBdt ? OPEN_TOPUP_MAX_BDT : OPEN_TOPUP_MAX_USD;
  const symbol = isBdt ? "৳" : "$";
  const credits = n >= min ? (isBdt ? creditsForBdt(n) : creditsForUsd(n)) : 0;
  const valid = n >= min && n <= max;

  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-card p-6 text-left shadow-sm">
      <h2 className="font-serif font-bold text-foreground text-lg">{t.topupTitle}</h2>
      <p className="mt-1 text-brand-body text-sm">
        {t.topupSubtitle.replace("৳{min}", `${symbol}${min.toLocaleString("en-US")}`)}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-40">
          <span className="-translate-y-1/2 absolute top-1/2 left-3 text-muted-foreground">
            {symbol}
          </span>
          <Input
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t.topupAmountPlaceholder}
            className="pl-7"
          />
        </div>
        <span className="text-brand-body text-sm">
          {t.topupYouGet}{" "}
          <span className="font-bold text-foreground">{credits.toLocaleString("en-US")}</span>
          {t.topupCreditsSuffix}
          {credits > 0 ? (
            <span className="text-brand-faint">
              {" "}
              · ~{premiumImagesFor(credits)}
              {t.topupRedesignsSuffix}
            </span>
          ) : null}
        </span>
        <Button className="sm:ml-auto" disabled={!valid || buying} onClick={() => onBuy(n)}>
          {buying ? t.processing : t.buy}
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
