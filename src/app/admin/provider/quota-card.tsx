import { CircleDollarSign, ImageIcon, Zap } from "lucide-react";
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
  /** Total successful images this provider has generated. */
  generationCount: number;
}

/** Small "N generated" footer shown on every provider card (pinned to bottom). */
function GeneratedFooter({ count }: { count: number }) {
  return (
    <div className="mt-4 flex items-center gap-1.5 border-border border-t pt-3 text-brand-body text-xs">
      <ImageIcon className="size-3.5" />
      <span className="font-semibold text-foreground tabular-nums">{fmt(count)}</span> images generated
    </div>
  );
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
    <CardShell
      icon={<Zap className="size-4 text-primary" />}
      label={card.label}
      tag="free daily quota · resets 00:00 UTC"
      count={card.generationCount}
    >
      <div className="flex items-end justify-between">
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
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          // Floor the visible width at 2% when any quota is used, so tiny usage
          // still renders as a sliver instead of an invisible/empty bar.
          style={{ width: `${q.usedPct > 0 ? Math.max(2, q.usedPct) : 0}%` }}
        />
      </div>
    </CardShell>
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
    <CardShell
      icon={<CircleDollarSign className="size-4 text-primary" />}
      label={card.label}
      tag="pay-as-you-go"
      count={card.generationCount}
    >
      <div>
        <div className="text-brand-body text-xs">Balance remaining</div>
        <div className={`mt-0.5 font-bold text-3xl tabular-nums ${color}`}>{card.balance}</div>
      </div>
    </CardShell>
  );
}

/*
 * Shared card skeleton so both provider cards line up exactly: header row, a
 * min-height body (keeps the big value baseline + footer aligned whether or not
 * the card has a progress bar), then the generated-count footer.
 */
function CardShell({
  icon,
  label,
  tag,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tag: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-bold text-foreground">{label}</h2>
        </div>
        <span className="text-brand-body text-xs">{tag}</span>
      </div>

      {/* Fixed-height body so the value baseline + footer align across cards. */}
      <div className="flex min-h-[5.5rem] flex-col justify-start">{children}</div>

      <GeneratedFooter count={count} />
    </section>
  );
}
