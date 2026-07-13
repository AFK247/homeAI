import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGES } from "@/config/pages";
import { DesignPanel } from "../../_components/detail/design-panel";
import { GenerationPanel } from "../../_components/detail/generation-panel";
import { AdminService } from "../../_modules/admin.service";

/*
 * Admin — design detail. The design plus ALL its generation attempts
 * (retries/failures included). Reuses the shared DesignPanel + GenerationPanel.
 */
export default async function AdminDesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await AdminService.designDetail(id);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={PAGES.ADMIN.DESIGNS}
        className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to designs
      </Link>

      {/* Same layout as the generation detail page: design first, attempt(s) below. */}
      <DesignPanel design={data.design} />

      {data.attempts.length ? (
        data.attempts.map((a) => <GenerationPanel key={a.id} log={a} />)
      ) : (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 font-bold text-foreground">Generation attempts</h2>
          <p className="text-brand-body text-sm">No generation attempts logged for this design.</p>
        </section>
      )}
    </div>
  );
}
