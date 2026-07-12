import type { ComponentType } from "react";
import { shallow } from "zustand/shallow";
import { createWithEqualityFn } from "zustand/traditional";

/*
 * Imperative modal system (§7c), adopted from the reference (proa-erp) but backed by
 * shadcn primitives. Open any modal from anywhere via `useModal().openModal(config)` —
 * a single <ModalRenderer/> mounted once in the layout handles it. No local useState.
 */

export type ModalVariant = "info" | "destructive" | "success";

// biome-ignore lint/suspicious/noExplicitAny: props are validated at the call site by the component's own type
export type ModalConfig<TProps extends Record<string, any> = Record<string, any>> = {
  /** 'alert' = built-in confirm/alert chrome; 'custom' = render `component` inside a Dialog. */
  type?: "alert" | "custom";
  title?: string;
  description?: string;
  variant?: ModalVariant;
  /** Confirm/cancel labels for alert type. */
  actionLabel?: string;
  cancelLabel?: string;
  /** Async confirm handler; the renderer shows a pending state while it runs. */
  onConfirm?: () => Promise<void> | void;
  onClose?: () => void;
  /** Custom modal body. Receives `props` plus an injected `closeModal`. */
  component?: ComponentType<TProps & { closeModal: () => void }>;
  props?: TProps;
  /** Extra classes for the dialog container. */
  className?: string;
};

type ModalStore = {
  isOpen: boolean;
  config: ModalConfig | null;
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  resetModal: () => void;
};

export const useModal = createWithEqualityFn<ModalStore>(
  (set) => ({
    isOpen: false,
    config: null,
    openModal: (config) => set({ isOpen: true, config }),
    closeModal: () => set({ isOpen: false }), // keep config for exit animation
    resetModal: () => set({ isOpen: false, config: null }),
  }),
  shallow,
);
