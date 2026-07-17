"use client";

import { useModal, useSheet } from "@/components/modal";
import { useIsDesktop } from "@/hooks/use-media-query";
import { handleORPCError } from "@/lib/utils/error";
import { rpc } from "@/server/rpc/client";
import { CategoryProductsPanel } from "./category-products-panel";

/*
 * Tap a furniture pin (or a "furniture in this room" row) → open the category's "shop
 * similar" list as a centered modal on desktop / bottom sheet on mobile. Fetches a few
 * real products in that master category (also logs a tag_click server-side).
 */
export function useCategoryProducts() {
  const isDesktop = useIsDesktop();
  const { openModal } = useModal();
  const { openSheet } = useSheet();

  return async function openCategory(categoryId: string, categoryName: string) {
    try {
      const products = await rpc.furniture.byCategory({ categoryId });
      const body = () => <CategoryProductsPanel categoryName={categoryName} products={products} />;
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
