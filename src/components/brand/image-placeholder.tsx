import { cn } from "@/lib/utils";

/*
 * Striped diagonal placeholder standing in for a room image (matches the design's
 * repeating-linear-gradient). Replaced by <Image> once R2 URLs exist (Stage D).
 */
export function ImagePlaceholder({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{
        background:
          "repeating-linear-gradient(45deg, #E5E8DD, #E5E8DD 14px, #D7DCCC 14px, #D7DCCC 28px)",
      }}
    >
      {label ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[#8C9285] text-xs">{label}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}
