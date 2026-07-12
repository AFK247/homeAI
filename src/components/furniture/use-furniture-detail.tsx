"use client";

import { useModal, useSheet } from "@/components/modal";
import type { FurnitureDetail } from "@/db/types";
import { useIsDesktop } from "@/hooks/use-media-query";
import { FurnitureDetailPanel } from "./furniture-detail-panel";

/*
 * Opens the furniture detail as a centered modal on desktop, bottom sheet on mobile
 * (design §7b / plan §7c). One component, two presentations.
 */
export function useFurnitureDetail() {
  const isDesktop = useIsDesktop();
  const { openModal } = useModal();
  const { openSheet } = useSheet();

  return function openFurniture(item: FurnitureDetail, pinIndex = 1) {
    if (isDesktop) {
      openModal({
        type: "custom",
        component: () => <FurnitureDetailPanel item={item} pinIndex={pinIndex} />,
        className: "sm:max-w-lg",
      });
    } else {
      openSheet({
        component: () => <FurnitureDetailPanel item={item} pinIndex={pinIndex} />,
        side: "bottom",
        className: "rounded-t-3xl",
      });
    }
  };
}
