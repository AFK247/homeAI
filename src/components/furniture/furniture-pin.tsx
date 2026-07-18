"use client";

import type { ResolvedDesignTag } from "@/db/types";

/*
 * A furniture pin overlaid on the generated image (design §7b). Positioned by the tag's
 * 0..1 relative coords. Shows the CATEGORY name ("Sofa", "Coffee table"); tapping it opens
 * a modal of real products in that category ("shop similar"). Falls back to the raw label
 * for legacy pins with no resolved category.
 */
export function FurniturePin({
  tag,
  onOpen,
}: {
  tag: ResolvedDesignTag;
  onOpen?: (tag: ResolvedDesignTag) => void;
}) {
  const name = tag.categoryName ?? tag.label;
  const clickable = Boolean(tag.categoryId && onOpen);

  const base =
    "-translate-x-1/2 -translate-y-1/2 absolute flex items-center gap-1.5 rounded-full bg-white py-1 pr-3 pl-2 shadow-lg";
  const position = { top: `${tag.yCoord * 100}%`, left: `${tag.xCoord * 100}%` };

  const inner = (
    <>
      <span className="size-2 shrink-0 rounded-full bg-primary" />
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
