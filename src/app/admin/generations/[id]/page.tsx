import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGES } from "@/config/pages";
import { DesignPanel } from "../../_components/detail/design-panel";
import { GenerationPanel } from "../../_components/detail/generation-panel";
import { AdminService } from "../../_modules/admin.service";

/*
 * Admin — generation detail. The single attempt's full technical record, plus
 * its parent design (if any). Reuses the shared GenerationPanel + DesignPanel.
 */
export default async function AdminGenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await AdminService.generationDetail(id);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={PAGES.ADMIN.GENERATIONS}
        className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to generations
      </Link>

      {/* Same layout as the design detail page: design first, attempt(s) below. */}
      {data.design ? (
        <DesignPanel design={data.design} />
      ) : (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 font-bold text-foreground">Design</h2>
          <p className="text-brand-body text-sm">
            This attempt produced no design (it failed before a design was saved).
          </p>
        </section>
      )}

      <GenerationPanel log={data.attempt} />
    </div>
  );
}
