"use client";

import { useModal, useSheet } from "@/components/modal";
import { useIsDesktop } from "@/hooks/use-media-query";
import { handleORPCError } from "@/lib/utils/error";
import { rpc } from "@/server/rpc/client";
import { FurnitureDetailPanel } from "./furniture-detail-panel";

/*
 * Opens the furniture detail as a centered modal on desktop, bottom sheet on
 * mobile (design §7b / plan §7c). Fetches the real detail by furniture item id
 * (which also logs a tag_click server-side), then renders the panel.
 */
export function useFurnitureDetail() {
  const isDesktop = useIsDesktop();
  const { openModal } = useModal();
  const { openSheet } = useSheet();

  return async function openFurniture(furnitureItemId: string, pinIndex = 1) {
    try {
      const item = await rpc.furniture.getDetail({ id: furnitureItemId });
      const body = () => <FurnitureDetailPanel item={item} pinIndex={pinIndex} />;
      if (isDesktop) {
        openModal({ type: "custom", component: body, className: "sm:max-w-lg" });
      } else {
        openSheet({ component: body, side: "bottom", className: "rounded-t-3xl" });
      }
    } catch (error) {
      handleORPCError(error);
    }
  };
}
