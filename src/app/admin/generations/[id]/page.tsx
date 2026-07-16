import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGES } from "@/config/pages";
import { serverRpc } from "@/server/rpc/server";
import { GenerationPanel } from "../../_components/detail/generation-panel";

/*
 * Admin — generation detail. Shows ONLY this one generation attempt (its image +
 * technical record). Kept focused; the parent design is on the Designs page.
 */
export default async function AdminGenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await serverRpc.generation.getById({ id });
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={PAGES.ADMIN.GENERATIONS}
        className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to generations
      </Link>

      <GenerationPanel log={data.attempt} />
    </div>
  );
}
