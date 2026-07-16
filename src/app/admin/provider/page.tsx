import { Cpu } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { serverRpc } from "@/server/rpc/server";
import {
  providerBalances,
  providerChainStatus,
  providerQuotas,
} from "@/server/service/ai/providers/status";
import { ProviderList } from "./list";
import { ProviderCards } from "./quota-card";

// Always render fresh — balance + quota are live external data that must not be
// served from Next.js's route cache (otherwise the numbers look frozen).
export const dynamic = "force-dynamic";

/*
 * Admin — AI provider chain. Shows the ordered fallback list, each provider's
 * readiness, remaining balance, and free-tier quota (card + per-row). Balance +
 * quota run once server-side on load. Generation tries providers top-to-bottom
 * until one succeeds; the winner is saved on the design.
 *
 * Vendor-agnostic: every figure comes from the provider interface, so adding or
 * swapping a provider needs no change here.
 */
export default async function AdminProviderPage() {
  const chain = providerChainStatus();
  const [balances, quotas, genCounts] = await Promise.all([
    providerBalances(),
    providerQuotas(),
    serverRpc.generation.countsByProvider(),
  ]);
  const balanceByKey = Object.fromEntries(balances.map((b) => [b.key, b]));
  const quotaByKey = Object.fromEntries(quotas.map((q) => [q.key, q.quota]));
  const rows = chain.map((c) => ({
    ...c,
    balance: balanceByKey[c.key]?.display ?? "—",
    balanceRemaining: balanceByKey[c.key]?.remaining ?? null,
    // Free-tier quota; null for providers that don't report one (pay-as-you-go).
    quota: quotaByKey[c.key] ?? null,
    // Total successful images this provider has generated.
    generationCount: genCounts[c.key] ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="AI Providers"
        description="Image generation tries these in order until one succeeds (fallback chain)."
        icon={<Cpu className="size-5" />}
      />

      <ProviderCards
        cards={rows.map((r) => ({
          key: r.key,
          label: r.label,
          quota: r.quota,
          balance: r.balance,
          balanceRemaining: r.balanceRemaining,
          generationCount: r.generationCount,
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
    </>
  );
}
