"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSheet } from "./sheet.store";

/*
 * Single sheet renderer (§7c). Mount once in the root layout. Renders the configured
 * component inside a shadcn Sheet and injects `closeSheet` as a prop.
 */
export function SheetRenderer() {
  const { isOpen, config, closeSheet, resetSheet } = useSheet();
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the intended trigger — re-run on navigation.
  useEffect(() => {
    resetSheet();
  }, [pathname, resetSheet]);

  if (!config) return null;

  const Body = config.component;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent side={config.side ?? "right"} className={config.className}>
        {config.title ? (
          <SheetHeader>
            <SheetTitle>{config.title}</SheetTitle>
            {config.description ? <SheetDescription>{config.description}</SheetDescription> : null}
          </SheetHeader>
        ) : null}
        <Body {...(config.props ?? {})} closeSheet={closeSheet} />
      </SheetContent>
    </Sheet>
  );
}
