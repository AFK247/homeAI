import { Cpu } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { serverRpc } from "@/server/rpc/server";
import {
  modelNeuronUsage,
  providerBalances,
  providerChainStatus,
  providerQuotas,
} from "@/server/service/ai/providers/status";
import { categoryModelStatus } from "@/server/service/category/category-mapper";
import { visionChainStatus } from "@/server/service/vision/registry";
import { ProviderList } from "./list";
import { ProviderCards } from "./quota-card";

// Always render fresh — balance + quota are live external data that must not be
// served from Next.js's route cache (otherwise the numbers look frozen).
export const dynamic = "force-dynamic";

/*
 * Admin — every AI provider in one place: cards up top, then a single table listing
 * all providers (image generation + furniture tagging) with readiness, balance,
 * quota, generated count, and real cost/call. Same layout as the generations page.
 *
 * Vendor-agnostic: every figure comes from the provider interface, so adding or
 * swapping a provider needs no change here.
 */
export default async function AdminProviderPage() {
  const imageChain = providerChainStatus();
  const [balances, quotas, genCounts, usage] = await Promise.all([
    providerBalances(),
    providerQuotas(),
    serverRpc.generation.countsByProvider(),
    modelNeuronUsage(),
  ]);
  const balanceByKey = Object.fromEntries(balances.map((b) => [b.key, b]));
  const quotaByKey = Object.fromEntries(quotas.map((q) => [q.key, q.quota]));

  // Image-generation providers — full metrics.
  const imageRows = imageChain.map((c) => ({
    ...c,
    kind: "Image" as const,
    balance: balanceByKey[c.key]?.display ?? "—",
    balanceRemaining: balanceByKey[c.key]?.remaining ?? null,
    quota: quotaByKey[c.key] ?? null,
    generationCount: genCounts[c.key] ?? 0,
    usage: usage[c.model] ?? null,
  }));

  // Vision (furniture-tagging) providers — no own balance/quota/generated count
  // (they share the Cloudflare quota above), so those columns show "—".
  const visionRows = visionChainStatus().map((v) => ({
    ...v,
    kind: "Tagging" as const,
    balance: "—",
    balanceRemaining: null,
    quota: null,
    generationCount: 0,
    usage: usage[v.model] ?? null,
  }));

  // Category mapping — a single Cloudflare text model (shares the Cloudflare quota).
  const cat = categoryModelStatus();
  const categoryRows = [
    {
      ...cat,
      kind: "Category" as const,
      balance: "—",
      balanceRemaining: null,
      quota: null,
      generationCount: 0,
      usage: usage[cat.model] ?? null,
    },
  ];

  // ONE table, ordered by role: image providers, then tagging, then category mapping.
  const rows = [
    ...imageRows.map((r, i) => ({ ...r, order: i + 1 })),
    ...visionRows.map((r, i) => ({ ...r, order: imageRows.length + i + 1 })),
    ...categoryRows.map((r, i) => ({
      ...r,
      order: imageRows.length + visionRows.length + i + 1,
    })),
  ];

  return (
    <>
      <PageHeader
        title="AI Providers"
        description="Ordered fallback chains for image generation and furniture tagging. Each tries its providers top-to-bottom until one succeeds."
        icon={<Cpu className="size-5" />}
      />

      <ProviderCards
        cards={imageRows.map((r) => ({
          key: r.key,
          label: r.label,
          quota: r.quota,
          balance: r.balance,
          balanceRemaining: r.balanceRemaining,
          generationCount: r.generationCount,
        }))}
      />

      <ProviderList data={rows} />
    </>
  );
}
