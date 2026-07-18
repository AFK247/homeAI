"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * IconButton — a reusable circular icon-only button with a built-in hover/focus tooltip.
 * Extracted from the repeated overlay controls on the result screen; meant to be the single
 * icon-action primitive across the app (image overlays, toolbars, cards, etc.).
 *
 * The `label` is REQUIRED and does double duty: it's the tooltip text AND the aria-label, so
 * every icon button is accessible by construction. Pass the icon as children. Any native
 * button prop (onClick, disabled, type) is forwarded. Set `tooltip={false}` to suppress the
 * hint (label still labels the button for screen readers).
 */

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        // Dark translucent pill over imagery (result canvas overlay).
        overlay: "bg-[rgba(22,44,36,0.72)] text-white hover:bg-[rgba(22,44,36,0.9)]",
        // Neutral, sits on cards / light surfaces.
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        // Solid brand.
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-9 [&_svg]:size-4",
        lg: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: { variant: "overlay", size: "md" },
  },
);

interface IconButtonProps
  extends Omit<React.ComponentProps<"button">, "aria-label">,
    VariantProps<typeof iconButtonVariants> {
  /** Tooltip text + aria-label (required — keeps every icon button accessible). */
  label: string;
  /** Which side the tooltip appears on. */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Suppress the hover tooltip (the label still labels the button for a11y). */
  tooltip?: boolean;
}

function IconButton({
  label,
  variant,
  size,
  tooltip = true,
  tooltipSide = "top",
  className,
  type = "button",
  children,
  ...props
}: IconButtonProps) {
  const button = (
    <button
      type={type}
      aria-label={label}
      title={tooltip ? undefined : label}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide}>{label}</TooltipContent>
    </Tooltip>
  );
}

export { IconButton, iconButtonVariants };
