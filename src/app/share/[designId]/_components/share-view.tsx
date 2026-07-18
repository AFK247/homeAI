"use client";

import { Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { DesignPublicRow } from "@/app/create/_modules/design.service";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/lib/i18n/client";

/*
 * The shared design's image card (client — owns the download interaction). The surrounding
 * landing page (hero copy, steps, CTAs) lives in the server page; this is just the visual.
 * `design` is the narrowed public shape from getPublicById (image + room/style only — no
 * original photo, owner ids, prompt, or pins).
 */
export function ShareView({ design }: { design: DesignPublicRow }) {
  const { dict } = useTranslation();
  const [downloading, setDownloading] = useState(false);
  const imageUrl = design.generatedImageUrl;

  async function download() {
    if (!imageUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `home-ai-${design.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(imageUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative h-[380px] overflow-hidden rounded-2xl shadow-sm sm:h-[460px] lg:h-[560px]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={dict.result.imageAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      ) : (
        <ImagePlaceholder label={dict.result.imageAlt} className="size-full" />
      )}

      {imageUrl && (
        <div className="absolute top-3 right-3">
          <IconButton label={dict.result.download} onClick={download} disabled={downloading}>
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          </IconButton>
        </div>
      )}
    </div>
  );
}
