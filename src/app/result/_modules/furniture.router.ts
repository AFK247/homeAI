import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { publicProcedure } from "@/server/rpc/procedures";
import { EventService } from "@/server/service/event.service";
import { FurnitureService } from "@/server/service/furniture.service";

/*
 * Furniture router — the catalog admin list plus the customer-facing tap-a-pin
 * detail panel (which also logs the product events we sell to vendors).
 * Convention: GET for reads, POST for anything with a side effect (getDetail logs
 * an event, so it's a POST despite reading).
 */
export const furnitureRouter = {
  // Admin catalog list — backend search/filter/sort/pagination.
  getPaginated: publicProcedure
    .route({ method: "GET" })
    .input(searchParamsSchema)
    .handler(({ input }) => FurnitureService.list(input)),

  // Tap a pin: return the full detail AND log a tag_click (side effect ⇒ POST).
  getDetail: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const detail = await FurnitureService.getDetail(input.id);
      if (!detail) throw new ORPCError("NOT_FOUND", { message: "furniture not found" });
      EventService.log({
        eventType: "tag_click",
        anonymousId: context.anonymousId,
        metadata: { furnitureItemId: detail.id, categoryId: detail.categoryId },
      });
      return detail;
    }),

  // Tap a pin: return up to a few products in that master category ("shop similar") and
  // log a tag_click. Side effect ⇒ POST.
  byCategory: publicProcedure
    .route({ method: "POST" })
    .input(z.object({ categoryId: z.string().min(1) }))
    .handler(async ({ input, context }) => {
      const items = await FurnitureService.byCategoryId(input.categoryId);
      EventService.log({
        eventType: "tag_click",
        anonymousId: context.anonymousId,
        metadata: { categoryId: input.categoryId, count: items.length },
      });
      return items;
    }),

  // Buy New / Buy Used clicked: log a buy_click (the conversion signal).
  logBuyClick: publicProcedure
    .route({ method: "POST" })
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

/** Row type for the admin furniture table — inferred, never hand-written. */
export type FurnitureRow = Awaited<ReturnType<typeof FurnitureService.list>>["data"][number];
