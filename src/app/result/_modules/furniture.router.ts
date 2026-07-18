import "server-only";

import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { searchParamsSchema } from "@/db/helpers/search-params";
import { adminProcedure, publicProcedure } from "@/server/rpc/procedures";
import { EventService } from "@/server/service/event.service";
import { FurnitureService } from "@/server/service/furniture.service";

/*
 * Furniture router — mixes an ADMIN catalog list with CUSTOMER-facing tap-a-pin endpoints.
 *  - getPaginated: admin catalog management → adminProcedure (role=admin).
 *  - getDetail / byCategory / logBuyClick: public "shop the look" — furniture is public
 *    product data any shopper can browse; events are scoped by the caller's anonymousId.
 * Convention: GET for reads, POST for anything with a side effect.
 */
export const furnitureRouter = {
  // Admin catalog list — backend search/filter/sort/pagination. Admin-only.
  getPaginated: adminProcedure
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
