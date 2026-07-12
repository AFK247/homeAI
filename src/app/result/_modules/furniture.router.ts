import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { publicProcedure } from "@/server/rpc/procedures";
import { EventService } from "@/server/service/event.service";
import { FurnitureService } from "@/server/service/furniture.service";

/*
 * Furniture router — powers the tap-a-pin detail panel and logs the product
 * events we sell to vendors (tag_click, buy_click).
 */
export const furnitureRouter = {
  // Tap a pin: return the full detail AND log a tag_click.
  getDetail: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const detail = await FurnitureService.getDetail(input.id);
      if (!detail) throw new ORPCError("NOT_FOUND", { message: "furniture not found" });
      EventService.log({
        eventType: "tag_click",
        anonymousId: context.anonymousId,
        metadata: { furnitureItemId: detail.id, category: detail.category },
      });
      return detail;
    }),

  // Buy New / Buy Used clicked: log a buy_click (the conversion signal).
  logBuyClick: publicProcedure
    .input(
      z.object({
        furnitureItemId: z.string().min(1),
        condition: z.enum(["new", "used"]),
      }),
    )
    .handler(({ input, context }) => {
      EventService.log({
        eventType: "buy_click",
        anonymousId: context.anonymousId,
        metadata: { furnitureItemId: input.furnitureItemId, condition: input.condition },
      });
      return { ok: true };
    }),
};
