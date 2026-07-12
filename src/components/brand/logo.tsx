import { cn } from "@/lib/utils";

/** Brand logo — rounded-square "H" in deep green + wordmark (design §7b). */
export function Logo({
  size = "md",
  withWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}) {
  const box =
    size === "lg" ? "h-12 w-12 text-2xl" : size === "sm" ? "h-8 w-8 text-base" : "h-9 w-9 text-lg";
  const word = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-primary font-serif font-extrabold text-primary-foreground shadow-lg",
          box,
        )}
      >
        H
      </div>
      {withWordmark ? (
        <span className={cn("font-serif font-bold text-foreground", word)}>হোম এআই</span>
      ) : null}
    </div>
  );
}
