"use client";

import { Download, Link2, RefreshCw, Share2 } from "lucide-react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { FurniturePin } from "@/components/furniture/furniture-pin";
import { useFurnitureDetail } from "@/components/furniture/use-furniture-detail";
import { Button } from "@/components/ui/button";
import { STYLE_OPTIONS } from "@/config/catalog";
import type { DesignWithTags, FurnitureDetail } from "@/db/types";
import { formatBdt } from "@/lib/format";
import { mockFurnitureDetail } from "@/lib/mock-data";

/*
 * Result screen body (design §7b). Image with clickable furniture pins, furniture list,
 * and regenerate / other-style / save / share actions. Responsive: single column on
 * mobile, image + side list on desktop.
 */
export function ResultView({ design }: { design: DesignWithTags }) {
  const openFurniture = useFurnitureDetail();
  const styleLabel = STYLE_OPTIONS.find((s) => s.value === design.style)?.bn ?? design.style;

  // Stage D resolves each tag to a full FurnitureDetail; for now reuse the mock detail.
  const toDetail = (): FurnitureDetail => mockFurnitureDetail;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Image + pins */}
      <div>
        <ImagePlaceholder
          label="সাজানো ঘরের ছবি / redesigned room"
          className="relative h-[340px] rounded-2xl lg:h-[470px]"
        >
          <div className="absolute top-3 left-3 rounded-full bg-[rgba(22,44,36,0.72)] px-3 py-1 font-semibold text-white text-xs">
            {styleLabel} · মাঝারি বাজেট
          </div>
          {design.tags.map((tag, i) => (
            <FurniturePin
              key={tag.id}
              tag={tag}
              index={i + 1}
              onOpen={() => openFurniture(toDetail(), i + 1)}
            />
          ))}
        </ImagePlaceholder>
        <p className="mt-3 text-center text-muted-foreground text-sm">
          দাম দেখতে যেকোনো আসবাবে ট্যাপ করুন
        </p>
      </div>

      {/* Furniture list + actions */}
      <div className="flex flex-col gap-4">
        <h2 className="font-serif font-bold text-foreground text-xl">এই ঘরের আসবাব</h2>
        <div className="flex flex-col gap-3">
          {design.tags.map((tag, i) => {
            const item = tag.furnitureItem;
            if (!item) return null;
            return (
              <button
                type="button"
                key={tag.id}
                onClick={() => openFurniture(toDetail(), i + 1)}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <ImagePlaceholder className="size-16 shrink-0 rounded-xl" />
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">{item.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {item.brand} · নতুন {item.priceBdt !== null ? formatBdt(item.priceBdt) : ""}
                  </div>
                  <div className="font-semibold text-brand-gold text-xs">
                    Bikroy · ব্যবহৃত {formatBdt(24000)}
                  </div>
                </div>
                <span className="text-brand-faint text-xl">›</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button className="gap-2">
            <RefreshCw className="size-4" /> আবার তৈরি করুন
          </Button>
          <Button variant="outline" className="gap-2">
            অন্য স্টাইল
          </Button>
          <Button variant="outline" className="gap-2">
            সংরক্ষণ
          </Button>
          <Button className="gap-2 bg-brand-whatsapp text-white hover:bg-brand-whatsapp/90">
            <Share2 className="size-4" /> শেয়ার
          </Button>
        </div>
        <div className="flex justify-center gap-6 text-muted-foreground text-sm">
          <span className="flex items-center gap-1.5">
            <Link2 className="size-4" /> লিংক কপি
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="size-4" /> ডাউনলোড
          </span>
        </div>
      </div>
    </div>
  );
}
