import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/config/pages";
import { toBnDigits } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/server";
import { serverRpc } from "@/server/rpc/server";
import { ShareView } from "./_components/share-view";

/*
 * Public share page — /share/<designId>. Readable by ANYONE (no anon cookie, no login): it
 * calls the design router's getPublicById (via serverRpc), which fetches by id only and
 * returns a narrowed shape (generated image + room/style) — never the original photo, owner
 * ids, prompt, or furniture pins. A missing/unfinished design 404s.
 *
 * This is a full landing-style page (not a bare image): SiteHeader nav → hero with the shared
 * design + primary CTA → how-it-works → brands → final CTA. The whole point is to convert a
 * visitor who arrived via a shared link into a user. generateMetadata adds OpenGraph tags so
 * the link unfurls with a preview image in WhatsApp/Facebook (key channels in BD).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ designId: string }>;
}): Promise<Metadata> {
  const { designId } = await params;
  const design = await serverRpc.design.getPublicById({ id: designId });
  const { dict } = await getDictionary();

  if (!design) return { title: dict.share.metaTitle };

  const title = dict.share.metaTitle;
  const description = dict.share.metaDescription;
  const image = design.generatedImageUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const { dict, locale } = await getDictionary();
  const design = await serverRpc.design.getPublicById({ id: designId });
  if (!design) notFound();

  const num = (n: number) => (locale === "bn" ? toBnDigits(n) : String(n));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10">
        {/* Preview is the hero; a slim aside carries just the essentials. */}
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          <ShareView design={design} />

          <aside className="flex flex-col gap-4">
            <span className="font-semibold text-primary text-xs uppercase tracking-wide">
              {dict.share.heroEyebrow}
            </span>
            <h1 className="font-serif font-extrabold text-2xl text-foreground leading-tight md:text-3xl">
              {dict.share.heroTitle}
            </h1>
            <p className="text-brand-body text-sm leading-relaxed">{dict.share.heroSubtitle}</p>
            <Button size="lg" asChild className="mt-1 w-fit">
              <Link href={PAGES.CREATE.INDEX}>{dict.share.tryCta}</Link>
            </Button>
            <span className="font-semibold text-brand-gold text-xs">
              ✓ {num(5)}
              {dict.landing.freeBadge}
            </span>
          </aside>
        </div>
      </main>
    </>
  );
}
