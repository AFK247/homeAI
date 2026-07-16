"use client";

import { Download, Expand, Eye, EyeOff, Link2, Loader2, RefreshCw, Share2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { FurniturePin } from "@/components/furniture/furniture-pin";
import { useFurnitureDetail } from "@/components/furniture/use-furniture-detail";
import { Button } from "@/components/ui/button";
import { STYLE_OPTIONS } from "@/config/catalog";
import type { DesignWithTags } from "@/db/types";
import { formatBdt } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { rpc } from "@/server/rpc/client";
import { VersionHistory } from "./version-history";

/*
 * Result screen body (design §7b). Image with clickable furniture pins, furniture list,
 * and regenerate / other-style / save / share actions. Responsive: single column on
 * mobile, image + side list on desktop.
 */
export function ResultView({ design }: { design: DesignWithTags }) {
  const { dict, locale } = useTranslation();
  const openFurniture = useFurnitureDetail();
  const router = useRouter();
  const [regenerating, startRegenerate] = useTransition();
  const [versionKey, setVersionKey] = useState(0); // bump to refetch version history
  const [fullscreen, setFullscreen] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true); // let the user declutter the image
  const hasPins = design.tags.length > 0;
  const styleLabel = STYLE_OPTIONS.find((s) => s.value === design.style)?.[locale] ?? design.style;

  function regenerate() {
    startRegenerate(async () => {
      try {
        await rpc.design.regenerate({ id: design.id });
        setVersionKey((k) => k + 1); // new version → refresh the history strip
        router.refresh(); // re-fetch the server component → shows the new image
      } catch {
        // Swallow; the button re-enables. (A toast system can surface this later.)
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Image + pins */}
      <div>
        <div className="relative h-[340px] overflow-hidden rounded-2xl lg:h-[470px]">
          {design.generatedImageUrl ? (
            <Image
              src={design.generatedImageUrl}
              alt={dict.result.imageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
              priority
            />
          ) : (
            <ImagePlaceholder label={dict.result.imageAlt} className="size-full" />
          )}
          <div className="absolute top-3 left-3 rounded-full bg-[rgba(22,44,36,0.72)] px-3 py-1 font-semibold text-white text-xs">
            {styleLabel} · {dict.result.budgetMedium}
          </div>
          {design.generatedImageUrl && (
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {hasPins && (
                <button
                  type="button"
                  onClick={() => setPinsVisible((v) => !v)}
                  aria-label={pinsVisible ? dict.result.hidePins : dict.result.showPins}
                  title={pinsVisible ? dict.result.hidePins : dict.result.showPins}
                  className="flex size-9 items-center justify-center rounded-full bg-[rgba(22,44,36,0.72)] text-white transition-colors hover:bg-[rgba(22,44,36,0.9)]"
                >
                  {pinsVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                aria-label={dict.result.fullscreen}
                title={dict.result.fullscreen}
                className="flex size-9 items-center justify-center rounded-full bg-[rgba(22,44,36,0.72)] text-white transition-colors hover:bg-[rgba(22,44,36,0.9)]"
              >
                <Expand className="size-4" />
              </button>
            </div>
          )}
          {regenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(22,44,36,0.55)] text-white">
              <Loader2 className="size-8 animate-spin" />
              <span className="font-semibold text-sm">{dict.result.regenerating}</span>
            </div>
          )}
          {pinsVisible &&
            design.tags.map((tag, i) => (
              <FurniturePin
                key={tag.id}
                tag={tag}
                index={i + 1}
                onOpen={
                  tag.furnitureItemId
                    ? () => openFurniture(tag.furnitureItemId as string, i + 1)
                    : undefined
                }
              />
            ))}
        </div>
        <p className="mt-3 text-center text-muted-foreground text-sm">{dict.result.tapHint}</p>
        <VersionHistory designId={design.id} refreshKey={versionKey} />
      </div>

      {/* Furniture list + actions */}
      <div className="flex flex-col gap-4">
        <h2 className="font-serif font-bold text-foreground text-xl">
          {dict.result.furnitureHeading}
        </h2>
        <div className="flex flex-col gap-3">
          {design.tags.map((tag, i) => {
            const item = tag.furnitureItem;
            if (!item || !tag.furnitureItemId) return null;
            return (
              <button
                type="button"
                key={tag.id}
                onClick={() => openFurniture(tag.furnitureItemId as string, i + 1)}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <ImagePlaceholder className="size-16 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">{item.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {item.brand} · {dict.result.conditionNew}{" "}
                    {item.priceBdt !== null ? formatBdt(item.priceBdt, locale) : ""}
                  </div>
                  <div className="font-semibold text-brand-gold text-xs">
                    Bikroy · {dict.result.conditionUsed} {formatBdt(24000, locale)}
                  </div>
                </div>
                <span className="text-brand-faint text-xl">›</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button className="gap-2" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {dict.result.regenerate}
          </Button>
          <Button variant="outline" className="gap-2">
            {dict.result.otherStyle}
          </Button>
          <Button variant="outline" className="gap-2">
            {dict.result.save}
          </Button>
          <Button className="gap-2 bg-brand-whatsapp text-white hover:bg-brand-whatsapp/90">
            <Share2 className="size-4" /> {dict.result.share}
          </Button>
        </div>
        <div className="flex justify-center gap-6 text-muted-foreground text-sm">
          <span className="flex items-center gap-1.5">
            <Link2 className="size-4" /> {dict.result.copyLink}
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="size-4" /> {dict.result.download}
          </span>
        </div>
      </div>

      {/* Fullscreen preview overlay — click backdrop or ✕ to close. */}
      {fullscreen && design.generatedImageUrl && (
        <button
          type="button"
          aria-label={dict.result.fullscreen}
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative h-full w-full">
            <Image
              src={design.generatedImageUrl}
              alt={dict.result.imageAlt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <span className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <X className="size-5" />
          </span>
        </button>
      )}
    </div>
  );
}
