"use client";

import Image from "next/image";
import Link from "next/link";
import type { DesignListData } from "@/app/create/_modules/promises";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { ROOM_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { useDataProvider } from "@/providers/data.provider";

/*
 * Client consumer: reads the anon's real designs from the DataProvider and
 * renders a grid of cards, each linking to its /result/[id]. Shows the actual
 * generated image when present, else the striped placeholder.
 */
export function DesignsGrid() {
  const { dict, locale } = useTranslation();
  const { designs } = useDataProvider<DesignListData>();

  if (designs.length === 0) {
    return <p className="mt-16 text-center text-brand-body">{dict.designs.empty}</p>;
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {designs.map((d) => {
        const style = STYLE_OPTIONS.find((s) => s.value === d.style)?.[locale] ?? d.style;
        const room = ROOM_OPTIONS.find((r) => r.value === d.roomType)?.[locale] ?? d.roomType;
        return (
          <Link
            key={d.id}
            href={PAGES.RESULT.VIEW(d.id)}
            className="overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            {d.generatedImageUrl ? (
              <div className="relative h-44 w-full">
                <Image
                  src={d.generatedImageUrl}
                  alt={`${style} · ${room}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <ImagePlaceholder className="h-44" />
            )}
            <div className="p-4">
              <div className="font-bold text-foreground">{style}</div>
              <div className="text-muted-foreground text-sm">{room}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
