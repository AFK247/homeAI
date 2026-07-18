"use client";

import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/*
 * "Redesigning your room" loader — shown over the image preview area while a generation is
 * in flight. Uses the app's own theme tokens (primary green, foreground ink, muted text)
 * so it sits cleanly on the create screen: a spinning ring around a pulsing green "H"
 * logo tile, the title/subtitle, and a progress bar. Text comes from the dictionary.
 */
export function GeneratingLoader({ className }: { className?: string }) {
  const { dict } = useTranslation();
  const g = dict.generating;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 rounded-2xl bg-background/95 p-6 text-center backdrop-blur-sm",
        className,
      )}
    >
      {/* Spinner ring with a pulsing "H" logo tile */}
      <div className="relative size-24">
        <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary [animation-duration:0.9s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary font-serif font-extrabold text-primary-foreground text-xl [animation:homeai-pulse_1.8s_ease-in-out_infinite]">
            H
          </div>
        </div>
      </div>

      {/* Title + subtitle */}
      <div className="max-w-xs">
        <div className="font-serif font-bold text-foreground text-xl leading-snug">{g.title}</div>
        <div className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{g.subtitle}</div>
      </div>

      {/* Progress bar + current step */}
      <div className="w-full max-w-[240px]">
        <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-1/3 animate-[loading-slide_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <div className="mt-2 font-medium text-brand-green-dark text-xs">{g.progress}</div>
      </div>
    </div>
  );
}
