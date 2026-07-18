"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // The app is LIGHT-ONLY (no .dark styles in globals.css and no next-themes provider mounted).
      // Forcing theme="light" stops sonner from following the OS scheme — otherwise, on a machine
      // in OS dark mode, sonner rendered its dark toast (near-black) while the rest of the app
      // stayed light. Switch this to a real theme value if/when dark mode is added.
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      // Only style the DEFAULT (plain `toast()`) surface + radius. We do NOT override the
      // success/error/info/warning colors here — those come from `richColors` (set on the
      // Toaster in app-providers) so each type gets its proper green/red/blue/amber. Overriding
      // --normal-* used to flatten every type to the same cream/dark-green (looked "black").
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
