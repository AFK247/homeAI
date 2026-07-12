"use client";

import { ArrowRight } from "lucide-react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import type { FurnitureDetail } from "@/db/types";
import { formatBdt, toBnDigits } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { mockUsedAlternative } from "@/lib/mock-data";

/*
 * Furniture detail body (design §7b). Rendered inside the modal (desktop) or sheet (mobile).
 * Buy New (green) + Buy Used (gold, Bikroy) + "similar in other brands" chips.
 * Tags are "find similar locally", not exact links (PROJECT_CONTEXT §4) — copy reflects that.
 *
 * `pinIndex` is the pin number; the used alternative is mock for now (Stage D wires real data).
 */
export function FurnitureDetailPanel({
  item,
  pinIndex = 1,
}: {
  item: FurnitureDetail;
  pinIndex?: number;
}) {
  const { dict, locale } = useTranslation();
  const dims = item.dimensions;
  const dimStr = dims
    ? `${toBnDigits(dims.width ?? 0)}″ × ${toBnDigits(dims.depth ?? 0)}″ × ${toBnDigits(dims.height ?? 0)}″`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3.5">
        <ImagePlaceholder label="product" className="h-26 w-26 shrink-0 rounded-2xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 font-bold text-[11px] text-secondary-foreground">
            {toBnDigits(pinIndex)} · {item.category ?? dict.furniture.fallbackCategory}
          </span>
          <h3 className="font-serif font-bold text-foreground text-lg leading-tight">
            {item.name}
          </h3>
          {dimStr ? (
            <p className="text-muted-foreground text-xs">
              {dict.furniture.dimensions} {dimStr}
            </p>
          ) : null}
        </div>
      </div>

      {item.priceBdt !== null ? (
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif font-extrabold text-2xl text-foreground">
            {formatBdt(item.priceBdt, locale)}
          </span>
          <span className="text-muted-foreground text-xs">
            {dict.furniture.conditionNew} · {item.brand ?? dict.furniture.fallbackBrand}
            {dict.furniture.byBrandSuffix}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {/* Buy New */}
        <a
          href={item.productUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-lg"
        >
          <div className="flex flex-col">
            <span className="font-bold text-sm">{dict.furniture.buyNew}</span>
            <span className="text-xs opacity-90">
              {item.brand ?? dict.furniture.fallbackBrand}
              {dict.furniture.officialStore}
            </span>
          </div>
          <span className="flex items-center gap-1 font-bold text-sm">
            {item.priceBdt !== null ? formatBdt(item.priceBdt, locale) : ""}{" "}
            <ArrowRight className="size-4" />
          </span>
        </a>

        {/* Buy Used (gold / Bikroy) */}
        <a
          href={mockUsedAlternative.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-2xl border-[1.5px] border-brand-gold bg-white px-4 py-3.5"
        >
          <div className="flex flex-col">
            <span className="font-bold text-brand-gold-dark text-sm">{dict.furniture.buyUsed}</span>
            <span className="text-brand-gold text-xs">
              Bikroy · {toBnDigits(mockUsedAlternative.listingCount)}
              {dict.furniture.listingsSuffix}
            </span>
          </div>
          <span className="flex items-center gap-1 font-bold text-brand-gold-dark text-sm">
            {formatBdt(mockUsedAlternative.priceBdt, locale)} <ArrowRight className="size-4" />
          </span>
        </a>
      </div>

      {item.similar.length > 0 ? (
        <div>
          <p className="mb-2 text-muted-foreground text-xs">{dict.furniture.similar}</p>
          <div className="flex flex-wrap gap-2">
            {item.similar.map((s) => (
              <span
                key={s.id}
                className="rounded-full border-[1.5px] border-border bg-white px-3.5 py-1.5 font-semibold text-foreground text-xs"
              >
                {s.brand} {s.priceBdt !== null ? formatBdt(s.priceBdt, locale, false) : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
