import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { HeaderCreditBadge } from "@/components/layout/header-credit-badge";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/config/pages";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/types";
import { serverRpc } from "@/server/rpc/server";

type Result = Dictionary["paymentResult"];

/*
 * Payment result (/payment/result?status=…&tran_id=…). SSLCommerz's success/fail/cancel callbacks
 * redirect here after the server-side confirm has already run (so the credits are granted by the
 * time this page loads on success). We READ — never grant — showing the outcome, the credits just
 * purchased, and the new balance. Server component: reads balance + the caller's own payment via
 * serverRpc, both scoped to the user. Bangla-first, localized.
 */

type Status = "success" | "pending" | "failed" | "cancelled";

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tran_id?: string }>;
}) {
  const { status: rawStatus, tran_id: tranId } = await searchParams;
  const status: Status =
    rawStatus === "success" || rawStatus === "pending" || rawStatus === "cancelled"
      ? rawStatus
      : rawStatus === "failed"
        ? "failed"
        : "failed";

  const { dict } = await getDictionary();
  const t = dict.paymentResult;

  // On success, show what was bought + the new balance. Both reads are user-scoped in the router,
  // so an unknown/foreign tran_id simply yields nulls.
  const isSuccess = status === "success";
  const [balance, payment] = isSuccess
    ? await Promise.all([
        serverRpc.credit.balance(),
        tranId ? serverRpc.payment.byTranId({ tranId }) : Promise.resolve(null),
      ])
    : [null, null];

  return (
    <>
      <SiteHeader rightSlot={<HeaderCreditBadge />} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-16 text-center">
        {isSuccess ? (
          <SuccessView
            t={t}
            credits={payment?.creditsPurchased ?? null}
            balance={balance?.total ?? null}
          />
        ) : status === "pending" ? (
          <PendingView t={t} />
        ) : status === "cancelled" ? (
          <CancelledView t={t} />
        ) : (
          <FailedView t={t} />
        )}
      </main>
    </>
  );
}

function SuccessView({
  t,
  credits,
  balance,
}: {
  t: Result;
  credits: number | null;
  balance: number | null;
}) {
  return (
    <>
      <CheckCircle2 className="size-16 text-primary" />
      <h1 className="mt-5 font-serif font-extrabold text-2xl text-foreground">{t.successTitle}</h1>
      <p className="mt-2 text-brand-body">{t.successBody}</p>

      <div className="mt-6 w-full rounded-2xl bg-card p-5 shadow-sm">
        {credits !== null ? (
          <div className="flex items-center justify-between">
            <span className="text-brand-body text-sm">{t.creditsAdded}</span>
            <span className="font-bold text-foreground">
              +{credits.toLocaleString("en-US")}
              {t.creditsSuffix}
            </span>
          </div>
        ) : null}
        {balance !== null ? (
          <div className="mt-2 flex items-center justify-between border-border/60 border-t pt-2">
            <span className="text-brand-body text-sm">{t.newBalance}</span>
            <span className="font-bold text-foreground">
              {balance.toLocaleString("en-US")}
              {t.creditsSuffix}
            </span>
          </div>
        ) : null}
      </div>

      <Button size="lg" className="mt-6 w-full" asChild>
        <Link href={PAGES.CREATE.INDEX}>{t.startDesigning}</Link>
      </Button>
    </>
  );
}

function PendingView({ t }: { t: Result }) {
  return (
    <>
      <Clock className="size-16 text-brand-gold" />
      <h1 className="mt-5 font-serif font-extrabold text-2xl text-foreground">{t.pendingTitle}</h1>
      <p className="mt-2 text-brand-body">{t.pendingBody}</p>
      <Button size="lg" variant="outline" className="mt-6 w-full" asChild>
        <Link href={PAGES.PRICING}>{t.viewBalance}</Link>
      </Button>
    </>
  );
}

function FailedView({ t }: { t: Result }) {
  return (
    <>
      <XCircle className="size-16 text-destructive" />
      <h1 className="mt-5 font-serif font-extrabold text-2xl text-foreground">{t.failedTitle}</h1>
      <p className="mt-2 text-brand-body">{t.failedBody}</p>
      <Button size="lg" className="mt-6 w-full" asChild>
        <Link href={PAGES.PRICING}>{t.tryAgain}</Link>
      </Button>
    </>
  );
}

function CancelledView({ t }: { t: Result }) {
  return (
    <>
      <XCircle className="size-16 text-muted-foreground" />
      <h1 className="mt-5 font-serif font-extrabold text-2xl text-foreground">
        {t.cancelledTitle}
      </h1>
      <p className="mt-2 text-brand-body">{t.cancelledBody}</p>
      <Button size="lg" className="mt-6 w-full" asChild>
        <Link href={PAGES.PRICING}>{t.tryAgain}</Link>
      </Button>
    </>
  );
}
