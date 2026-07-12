import { ImagePlaceholder } from "./image-placeholder";

/*
 * Before/after split with center handle (design landing hero §7b).
 * Static presentational version; a draggable slider can replace it later.
 */
export function BeforeAfter({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative flex h-full overflow-hidden rounded-3xl shadow-xl">
        <ImagePlaceholder className="flex-1">
          <span className="absolute top-3.5 left-3.5 rounded-full bg-[rgba(22,44,36,0.72)] px-3.5 py-1 font-semibold text-white text-xs">
            আগে
          </span>
        </ImagePlaceholder>
        <ImagePlaceholder className="flex-1">
          <span className="absolute top-3.5 right-3.5 rounded-full bg-primary px-3.5 py-1 font-semibold text-primary-foreground text-xs">
            পরে
          </span>
        </ImagePlaceholder>
        <div className="-translate-x-1/2 absolute top-0 bottom-0 left-1/2 w-[3px] bg-white" />
        <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-lg">
          ↔
        </div>
      </div>
    </div>
  );
}
