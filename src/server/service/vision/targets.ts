import type { RoomType } from "@/db/schemas/shared.schema";

/*
 * What furniture to look for, per room type.
 *
 * This is the main COST lever: providers that ground one phrase per call (moondream)
 * make one API call per target, so the list length multiplies cost linearly
 * (~$0.0002 / +20.7 Neurons each). Keep it to the big, genuinely shoppable pieces —
 * a marketplace sells sofas and wardrobes, not cushions.
 *
 * Ordered by how much the item matters to a shopper.
 */
export const ROOM_TARGETS: Record<RoomType, string[]> = {
  living_room: ["sofa", "coffee table", "tv", "cabinet"],
  bedroom: ["bed", "wardrobe", "bedside table", "lamp"],
  dining_room: ["dining table", "chair", "cabinet", "lamp"],
  kitchen: ["cabinet", "dining table", "chair"],
  prayer_corner: ["rug", "shelf", "lamp"],
  kids_room: ["bed", "desk", "bookshelf", "chair"],
};
