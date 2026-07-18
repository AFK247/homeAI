import { cn } from "@/lib/utils";

/*
 * Inline per-field error / helper text (ported from the reference form-builder).
 * Rendered by FormBase from react-hook-form's fieldState.error.
 */

const sizeClasses = {
  sm: "text-xs",
  md: "text-[13px]",
  lg: "text-sm",
} as const;

export function FieldError({
  error,
  className,
  size = "md",
}: {
  error?: string;
  className?: string;
  size?: keyof typeof sizeClasses;
}) {
  if (!error || error === "undefined") return null;
  return (
    <p className={cn(sizeClasses[size], "break-words text-destructive", className)}>{error}</p>
  );
}

export function FieldHelperText({
  children,
  className,
  size = "md",
}: {
  children?: React.ReactNode;
  className?: string;
  size?: keyof typeof sizeClasses;
}) {
  if (!children) return null;
  return <p className={cn(sizeClasses[size], "text-muted-foreground", className)}>{children}</p>;
}
