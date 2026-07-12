"use client";

import type { ResolvedDesignTag } from "@/db/types";
import { formatBdt, toBnDigits } from "@/lib/format";

/*
 * A clickable furniture price pin overlaid on the generated image (design §7b).
 * Positioned by the tag's 0..1 relative coords. `index` is the visible pin number.
 */
export function FurniturePin({
  tag,
  index,
  onOpen,
}: {
  tag: ResolvedDesignTag;
  index: number;
  onOpen: (tag: ResolvedDesignTag) => void;
}) {
  const price = tag.furnitureItem?.priceBdt ?? null;
  return (
    <button
      type="button"
      onClick={() => onOpen(tag)}
      className="-translate-x-1/2 -translate-y-1/2 absolute flex items-center gap-1.5 rounded-full bg-white py-1 pr-3 pl-1.5 shadow-lg transition-transform hover:scale-105"
      style={{ top: `${tag.yCoord * 100}%`, left: `${tag.xCoord * 100}%` }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-[11px] text-primary-foreground">
        {toBnDigits(index)}
      </span>
      {price !== null ? (
        <span className="font-bold text-foreground text-xs">{formatBdt(price, false)}</span>
      ) : null}
    </button>
  );
}
