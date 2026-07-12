"use client";

import { usePathname } from "next/navigation";
import { useEffect, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useModal } from "./modal.store";

/*
 * Single modal renderer (§7c). Mount once in the root layout. Reads the Zustand store
 * and renders either the built-in AlertDialog (type: 'alert') or a Dialog wrapping a
 * custom component (type: 'custom').
 */
export function ModalRenderer() {
  const { isOpen, config, closeModal, resetModal } = useModal();
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  // Reset on route change so a stale modal never lingers across navigations.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the intended trigger — re-run on navigation.
  useEffect(() => {
    resetModal();
  }, [pathname, resetModal]);

  if (!config) return null;

  const onOpenChange = (open: boolean) => {
    if (!open) {
      config.onClose?.();
      closeModal();
    }
  };

  const handleConfirm = () => {
    startTransition(async () => {
      await config.onConfirm?.();
      closeModal();
    });
  };

  // Alert / confirm modal with built-in chrome.
  if (config.type === "alert") {
    return (
      <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
        <AlertDialogContent className={config.className}>
          <AlertDialogHeader>
            {config.title ? <AlertDialogTitle>{config.title}</AlertDialogTitle> : null}
            {config.description ? (
              <AlertDialogDescription>{config.description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {config.cancelLabel ?? "বাতিল"}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              className={cn(
                config.variant === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {isPending ? "..." : (config.actionLabel ?? "নিশ্চিত করুন")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Custom modal: render the provided component inside a Dialog.
  const Body = config.component;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={config.className}>
        {config.title ? (
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            {config.description ? (
              <DialogDescription>{config.description}</DialogDescription>
            ) : null}
          </DialogHeader>
        ) : null}
        {Body ? <Body {...(config.props ?? {})} closeModal={closeModal} /> : null}
      </DialogContent>
    </Dialog>
  );
}
