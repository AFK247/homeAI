import { Cpu } from "lucide-react";
import { cloudflareDailyQuota } from "@/server/service/ai/providers/cloudflare-analytics";
import { providerBalances, providerChainStatus } from "@/server/service/ai/providers/status";
import { ProviderList } from "./list";
import { ProviderCards } from "./quota-card";

// Always render fresh — balance + quota are live external data that must not be
// served from Next.js's route cache (otherwise the numbers look frozen).
export const dynamic = "force-dynamic";

/*
 * Admin — AI provider chain. Shows the ordered fallback list, each provider's
 * readiness, remaining balance, and Cloudflare's real free daily quota (card +
 * per-row). Balance + quota run once server-side on load. Generation tries
 * providers top-to-bottom until one succeeds; the winner is saved on the design.
 */
export default async function AdminProviderPage() {
  const chain = providerChainStatus();
  // UTC-midnight = Cloudflare's daily quota reset boundary.
  const now = new Date();
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [balances, quota] = await Promise.all([
    providerBalances(),
    cloudflareDailyQuota(utcMidnight, now),
  ]);
  const balanceByKey = Object.fromEntries(balances.map((b) => [b.key, b]));
  const rows = chain.map((c) => ({
    ...c,
    balance: balanceByKey[c.key]?.display ?? "—",
    balanceRemaining: balanceByKey[c.key]?.remaining ?? null,
    // Cloudflare's real daily free-neuron quota; null for other providers.
    quota: c.key === "cloudflare" ? quota : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Cpu className="size-5" />
        </div>
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-foreground">AI Providers</h1>
          <p className="text-brand-body text-sm">
            Image generation tries these in order until one succeeds (fallback chain).
          </p>
        </div>
      </div>

      <ProviderCards
        cards={rows.map((r) => ({
          key: r.key,
          label: r.label,
          quota: r.quota,
          balance: r.balance,
          balanceRemaining: r.balanceRemaining,
        }))}
      />

      <ProviderList data={rows} />

      <p className="text-brand-body text-sm">
        To reorder, swap the primary, or add a provider, edit{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          src/server/service/ai/providers/registry.ts
        </code>
        . The provider that produced each image is saved on the design.
      </p>
    </div>
  );
}
