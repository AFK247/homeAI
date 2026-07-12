import { Check, Cpu, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { providerChainStatus } from "@/server/service/ai/providers/status";

/*
 * Admin — AI provider chain. Shows the ordered fallback list and each provider's
 * readiness. Generation tries them top-to-bottom until one succeeds; the winner
 * is persisted on each design (ai_provider / ai_model).
 */
export default function AdminProviderPage() {
  const chain = providerChainStatus();

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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="[&_tr]:border-border [&_tr]:border-b">
            <tr>
              <th className="px-4 py-3 font-semibold text-[#6B7280]">Order</th>
              <th className="px-4 py-3 font-semibold text-[#6B7280]">Provider</th>
              <th className="px-4 py-3 font-semibold text-[#6B7280]">Model</th>
              <th className="px-4 py-3 font-semibold text-[#6B7280]">Status</th>
            </tr>
          </thead>
          <tbody>
            {chain.map((p) => (
              <tr key={p.key} className="border-border border-b last:border-b-0">
                <td className="px-4 py-3 font-medium text-foreground">{p.order}</td>
                <td className="px-4 py-3 text-foreground">{p.label}</td>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.model}</code>
                </td>
                <td className="px-4 py-3">
                  {p.ready ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="size-3" /> Ready
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <X className="size-3" /> Not configured
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
