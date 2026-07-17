import type { RoomType } from "@/db/schemas/shared.schema";

/*
 * Seed master categories (docs/marketplace-plan.md §3). The initial vocabulary both
 * sides resolve into. Names are ALWAYS English — a controlled vocabulary / join key.
 *
 * `rooms` is which room types the AI detects this category in (the vision detector pulls
 * a room's active categories from the DB as its targets — kept cost-scoped per room).
 * A category with no rooms is still a valid catalog category, just not auto-detected.
 */
export interface SeedCategory {
  name: string;
  rooms: RoomType[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  // Seating
  { name: "sofa", rooms: ["living_room"] },
  { name: "armchair", rooms: ["living_room"] },
  { name: "dining chair", rooms: ["dining_room", "kitchen", "kids_room"] },
  { name: "office chair", rooms: [] },
  { name: "stool", rooms: [] },
  { name: "bench", rooms: [] },
  // Beds
  { name: "bed", rooms: ["bedroom", "kids_room"] },
  { name: "bedside table", rooms: ["bedroom"] },
  // Storage
  { name: "wardrobe", rooms: ["bedroom"] },
  { name: "almirah", rooms: [] },
  { name: "cabinet", rooms: ["living_room", "dining_room", "kitchen"] },
  { name: "chest of drawers", rooms: [] },
  { name: "shelf", rooms: ["prayer_corner"] },
  { name: "bookshelf", rooms: ["kids_room"] },
  { name: "shoe rack", rooms: [] },
  // Tables
  { name: "coffee table", rooms: ["living_room"] },
  { name: "dining table", rooms: ["dining_room", "kitchen"] },
  { name: "desk", rooms: ["kids_room"] },
  { name: "console table", rooms: [] },
  // Media / misc
  { name: "tv unit", rooms: ["living_room"] },
  { name: "dressing table", rooms: [] },
  { name: "mirror", rooms: [] },
  { name: "lamp", rooms: ["bedroom", "dining_room", "prayer_corner"] },
  { name: "rug", rooms: ["prayer_corner"] },
  // Escape hatch — anything the AI can't confidently place.
  { name: "other", rooms: [] },
];
