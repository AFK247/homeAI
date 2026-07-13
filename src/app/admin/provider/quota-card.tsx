import { CircleDollarSign, Zap } from "lucide-react";
import type { DailyQuota } from "@/server/service/ai/providers/cloudflare-analytics";

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export interface ProviderCard {
  key: string;
  label: string;
  /** Cloudflare: real daily free-neuron quota. */
  quota: DailyQuota | null;
  /** OpenRouter: remaining balance display + numeric. */
  balance: string;
  balanceRemaining: number | null;
}

/* One summary card per provider. Cloudflare shows its free daily neuron quota
 * (used/total + bar); a paid provider (OpenRouter) shows its remaining balance. */
export function ProviderCards({ cards }: { cards: ProviderCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {cards.map((c) => (c.quota ? <QuotaCard key={c.key} card={c} /> : <BalanceCard key={c.key} card={c} />))}
    </div>
  );
}

function QuotaCard({ card }: { card: ProviderCard }) {
  const q = card.quota as DailyQuota;
  const bar = q.usedPct >= 90 ? "bg-destructive" : q.usedPct >= 70 ? "bg-amber-500" : "bg-primary";
  const leftColor =
    q.usedPct >= 90
      ? "text-destructive"
      : q.usedPct >= 70
        ? "text-amber-600 dark:text-amber-500"
        : "text-foreground";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <h2 className="font-bold text-foreground">{card.label}</h2>
        </div>
        <span className="text-brand-body text-xs">free daily quota · resets 00:00 UTC</span>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="text-brand-body text-xs">Neurons left today</div>
          <div className={`mt-0.5 font-bold text-3xl tabular-nums ${leftColor}`}>{fmt(q.left)}</div>
        </div>
        <div className="text-right text-brand-body text-xs">
          <div>
            {fmt(q.used)} / {fmt(q.total)} used
          </div>
          <div className="mt-0.5 font-semibold text-foreground">{q.usedPct}% used</div>
        </div>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          // Floor the visible width at 2% when any quota is used, so tiny usage
          // still renders as a sliver instead of an invisible/empty bar.
          style={{ width: `${q.usedPct > 0 ? Math.max(2, q.usedPct) : 0}%` }}
        />
      </div>

      {q.usedPct >= 90 && (
        <p className="mt-2 font-medium text-destructive text-xs">
          Free quota nearly exhausted — generation falls through to the paid provider.
        </p>
      )}
    </section>
  );
}

function BalanceCard({ card }: { card: ProviderCard }) {
  const low = card.balanceRemaining != null && card.balanceRemaining < 5;
  const veryLow = card.balanceRemaining != null && card.balanceRemaining < 1;
  const color = veryLow
    ? "text-destructive"
    : low
      ? "text-amber-600 dark:text-amber-500"
      : "text-foreground";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="size-4 text-primary" />
          <h2 className="font-bold text-foreground">{card.label}</h2>
        </div>
        <span className="text-brand-body text-xs">pay-as-you-go</span>
      </div>

      <div>
        <div className="text-brand-body text-xs">Balance remaining</div>
        <div className={`mt-0.5 font-bold text-3xl tabular-nums ${color}`}>{card.balance}</div>
      </div>

      {low && (
        <p className="mt-2 font-medium text-amber-600 text-xs dark:text-amber-500">
          {veryLow ? "Balance nearly empty — top up." : "Balance running low."}
        </p>
      )}
    </section>
  );
}
