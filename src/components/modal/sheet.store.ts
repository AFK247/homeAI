import type { ComponentType } from "react";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";

/*
 * Imperative sheet/drawer system (§7c). Used for forms + the mobile furniture bottom sheet.
 * The renderer injects `closeSheet` as a prop into the rendered component, so the same
 * component works standalone or inside a sheet.
 */

export type SheetSide = "top" | "right" | "bottom" | "left";

// biome-ignore lint/suspicious/noExplicitAny: props are validated at the call site by the component's own type
export type SheetConfig<TProps extends Record<string, any> = Record<string, any>> = {
  component: ComponentType<TProps & { closeSheet: () => void }>;
  props?: TProps;
  title?: string;
  description?: string;
  side?: SheetSide;
  className?: string;
};

type SheetStore = {
  isOpen: boolean;
  config: SheetConfig | null;
  openSheet: <TProps extends Record<string, unknown>>(config: SheetConfig<TProps>) => void;
  closeSheet: () => void;
  resetSheet: () => void;
};

export const useSheet = createWithEqualityFn<SheetStore>(
  (set) => ({
    isOpen: false,
    config: null,
    openSheet: (config) => set({ isOpen: true, config: config as SheetConfig }),
    closeSheet: () => set({ isOpen: false }),
    resetSheet: () => set({ isOpen: false, config: null }),
  }),
  shallow,
);
