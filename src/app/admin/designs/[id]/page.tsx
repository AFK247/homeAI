import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGES } from "@/config/pages";
import { serverRpc } from "@/server/rpc/server";
import { DesignPanel } from "../../_components/detail/design-panel";

/*
 * Admin — design detail. Shows ONLY this one design (images + info). Generation
 * attempts live on the Generations page; this page stays focused on the design.
 */
export default async function AdminDesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await serverRpc.designAdmin.getById({ id });
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={PAGES.ADMIN.DESIGNS}
        className="inline-flex items-center gap-1 text-brand-body text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to designs
      </Link>

      <DesignPanel design={data.design} />
    </div>
  );
}
