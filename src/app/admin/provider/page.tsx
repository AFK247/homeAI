import { Check, Cpu, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { env } from "@/lib/env";
import { AI_PROVIDER } from "@/server/service/ai/provider-info";

/*
 * Admin — AI provider / model info. Reads the single source of truth
 * (provider-info.ts) so it always reflects what's actually running.
 */
export default function AdminProviderPage() {
  const configured = Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Provider", value: AI_PROVIDER.provider },
    { label: "Model", value: AI_PROVIDER.model },
    {
      label: "Model ID",
      value: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{AI_PROVIDER.modelId}</code>,
    },
    { label: "Vendor", value: AI_PROVIDER.vendor },
    { label: "Mode", value: AI_PROVIDER.mode },
    { label: "Inference steps", value: String(AI_PROVIDER.steps) },
    {
      label: "Response",
      value: AI_PROVIDER.sync ? "Synchronous (single request)" : "Async (job + polling)",
    },
    { label: "Free tier", value: AI_PROVIDER.freeTier },
    { label: "Released", value: String(AI_PROVIDER.releaseYear) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Cpu className="size-5" />
        </div>
        <div>
          <h1 className="font-serif font-extrabold text-3xl text-foreground">AI Provider</h1>
          <p className="text-brand-body text-sm">Image-generation model in use</p>
        </div>
        <Badge variant={configured ? "default" : "destructive"} className="ml-auto">
          {configured ? "Configured" : "Not configured"}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-border border-b last:border-0">
                <td className="w-48 px-5 py-3 font-semibold text-brand-body">{r.label}</td>
                <td className="px-5 py-3 text-foreground">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-foreground">How it works</h2>
        <ul className="flex flex-col gap-2">
          {AI_PROVIDER.notes.map((note) => (
            <li key={note} className="flex items-start gap-2 text-brand-body text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {note}
            </li>
          ))}
        </ul>
      </section>

      <a
        href={AI_PROVIDER.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1.5 font-semibold text-primary text-sm hover:underline"
      >
        Model documentation <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
