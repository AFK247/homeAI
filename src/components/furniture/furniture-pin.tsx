"use client";

import type { ResolvedDesignTag } from "@/db/types";
import { localeDigits } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";

/*
 * A furniture pin overlaid on the generated image (design §7b). Positioned by the tag's
 * 0..1 relative coords. Shows the CATEGORY name ("Sofa", "Coffee table"); tapping it opens
 * a modal of real products in that category ("shop similar"). Falls back to the raw label
 * for legacy pins with no resolved category.
 */
export function FurniturePin({
  tag,
  index,
  onOpen,
}: {
  tag: ResolvedDesignTag;
  index: number;
  onOpen?: (tag: ResolvedDesignTag) => void;
}) {
  const { locale } = useTranslation();
  const name = tag.categoryName ?? tag.label;
  const clickable = Boolean(tag.categoryId && onOpen);

  const base =
    "-translate-x-1/2 -translate-y-1/2 absolute flex items-center gap-1.5 rounded-full bg-white py-1 pr-3 pl-1.5 shadow-lg";
  const position = { top: `${tag.yCoord * 100}%`, left: `${tag.xCoord * 100}%` };

  const inner = (
    <>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-[11px] text-primary-foreground">
        {localeDigits(index, locale)}
      </span>
      {name ? (
        <span className="font-semibold text-foreground text-xs capitalize">{name}</span>
      ) : null}
    </>
  );

  if (!clickable) {
    return (
      <span className={base} style={position}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen?.(tag)}
      className={`${base} transition-transform hover:scale-105`}
      style={position}
    >
      {inner}
    </button>
  );
}
