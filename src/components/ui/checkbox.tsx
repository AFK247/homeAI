"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Minimal checkbox (native input, styled). Controlled via checked/onCheckedChange to match
 * the form-builder's Field* API. No external dependency.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      // biome-ignore lint/a11y/useSemanticElements: styled control needs a button, not a native checkbox
      role="checkbox"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex size-4 items-center justify-center rounded border border-input shadow-xs transition-colors",
        checked ? "border-primary bg-primary text-primary-foreground" : "bg-transparent",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </button>
  );
}
