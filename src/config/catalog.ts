import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";

/*
 * Static UI catalog config (plan §7b) — the visual options shown on the upload/style screens.
 * Bangla labels are the source of truth for the UI; `en` is the toggle fallback.
 */

export type StyleOption = { value: DesignStyle; bn: string; en: string };
export const STYLE_OPTIONS: StyleOption[] = [
  { value: "modern", bn: "আধুনিক", en: "Modern" },
  { value: "traditional_bangla", bn: "ঐতিহ্যবাহী বাংলা", en: "Traditional" },
  { value: "minimal", bn: "মিনিমাল", en: "Minimal" },
  { value: "luxury", bn: "বিলাসবহুল", en: "Luxury" },
  { value: "scandinavian", bn: "স্ক্যান্ডিনেভিয়ান", en: "Scandinavian" },
  { value: "classic", bn: "ক্লাসিক", en: "Classic" },
];

export type RoomOption = { value: RoomType; bn: string; en: string };
export const ROOM_OPTIONS: RoomOption[] = [
  { value: "living_room", bn: "বসার ঘর", en: "Living room" },
  { value: "bedroom", bn: "শোবার ঘর", en: "Bedroom" },
  { value: "dining_room", bn: "খাবার ঘর", en: "Dining room" },
  { value: "kitchen", bn: "রান্নাঘর", en: "Kitchen" },
  { value: "prayer_corner", bn: "নামাজের কোণ", en: "Prayer corner" },
  { value: "kids_room", bn: "বাচ্চাদের ঘর", en: "Kids room" },
];

export type BudgetOption = { value: BudgetTier; bn: string; en: string };
export const BUDGET_OPTIONS: BudgetOption[] = [
  { value: "low", bn: "কম", en: "Low" },
  { value: "medium", bn: "মাঝারি", en: "Medium" },
  { value: "premium", bn: "প্রিমিয়াম", en: "Premium" },
];

/** Free-generation cap (cost control, PROJECT_CONTEXT §9.1). */
export const FREE_GENERATION_LIMIT = 5;
