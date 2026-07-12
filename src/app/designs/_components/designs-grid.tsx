"use client";

import Link from "next/link";
import type { DesignListData } from "@/app/create/_modules/promises";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { ROOM_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import { useDataProvider } from "@/providers/data.provider";

/*
 * Client consumer: reads the anon's real designs from the DataProvider and
 * renders a grid of cards, each linking to its /result/[id]. Shows the actual
 * generated image when present, else the striped placeholder.
 */
export function DesignsGrid() {
  const { designs } = useDataProvider<DesignListData>();

  if (designs.length === 0) {
    return <p className="mt-16 text-center text-brand-body">এখনো কোনো ডিজাইন তৈরি করেননি।</p>;
  }

  return (
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {designs.map((d) => {
        const style = STYLE_OPTIONS.find((s) => s.value === d.style)?.bn ?? d.style;
        const room = ROOM_OPTIONS.find((r) => r.value === d.roomType)?.bn ?? d.roomType;
        return (
          <Link
            key={d.id}
            href={`/result/${d.id}`}
            className="overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            {d.generatedImageUrl ? (
              // biome-ignore lint/performance/noImgElement: external MinIO/R2 URL
              <img
                src={d.generatedImageUrl}
                alt={`${style} · ${room}`}
                className="h-44 w-full object-cover"
              />
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
