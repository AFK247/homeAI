/*
 * Typed mock data (Stage C). Every value satisfies the Phase 1B types so that when the
 * backend lands (Stage D), components swap mock → real rpc calls with zero rework.
 *
 * TEMPORARY: delete once services are wired. Do not import from server code.
 */
import type { DesignWithTags, FurnitureDetail, FurnitureItem, Vendor } from "@/db/types";

const now = "2026-07-12T09:41:00.000Z";

export const mockVendors: Vendor[] = [
  {
    id: "v_hatil",
    name: "Hatil",
    type: "brand",
    contact: null,
    websiteUrl: "https://www.hatil.com",
    isVerified: true,
    commissionRate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: "v_otobi",
    name: "Otobi",
    type: "brand",
    contact: null,
    websiteUrl: "https://www.otobi.com",
    isVerified: true,
    commissionRate: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
];

export const mockFurniture: FurnitureItem[] = [
  {
    id: "f_sofa",
    name: "কাঠের সোফা সেট (৩ সিটার)",
    brand: "Hatil",
    categoryId: null,
    dimensions: { width: 84, height: 32, depth: 36, unit: "in" },
    priceBdt: 42000,
    imageUrl: null,
    productUrl: "https://www.hatil.com/sofa",
    condition: "new",
    source: "brand",
    region: "bd",
    vendorId: "v_hatil",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: "f_table",
    name: "সেন্টার টেবিল",
    brand: "Otobi",
    categoryId: null,
    dimensions: { width: 40, height: 18, depth: 24, unit: "in" },
    priceBdt: 8500,
    imageUrl: null,
    productUrl: "https://www.otobi.com/table",
    condition: "new",
    source: "brand",
    region: "bd",
    vendorId: "v_otobi",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
  {
    id: "f_lamp",
    name: "ফ্লোর ল্যাম্প",
    brand: "Regal",
    categoryId: null,
    dimensions: { width: 12, height: 60, depth: 12, unit: "in" },
    priceBdt: 3200,
    imageUrl: null,
    productUrl: "https://www.regalfurniture.com/lamp",
    condition: "new",
    source: "brand",
    region: "bd",
    vendorId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  },
];

/** The result-screen design with resolved furniture pins (positions 0..1). */
export const mockDesign: DesignWithTags = {
  id: "a3f9",
  userId: null,
  anonymousId: "anon_demo",
  originalImageUrl: "",
  generatedImageUrl: "",
  roomType: "living_room",
  style: "modern",
  prompt: null,
  isPanorama: false,
  jobId: null,
  aiProvider: "cloudflare",
  aiModel: "@cf/black-forest-labs/flux-2-klein-9b",
  status: "done",
  isSaved: false,
  expiresAt: null,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
  tags: [
    {
      id: "t1",
      designId: "a3f9",
      designVersionId: null,
      furnitureItemId: "f_sofa",
      categoryId: null,
      label: "সোফা",
      xCoord: 0.26,
      yCoord: 0.44,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      furnitureItem: mockFurniture[0] ?? null,
      categoryName: "sofa",
    },
    {
      id: "t2",
      designId: "a3f9",
      designVersionId: null,
      furnitureItemId: "f_table",
      categoryId: null,
      label: "টেবিল",
      xCoord: 0.6,
      yCoord: 0.68,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      furnitureItem: mockFurniture[1] ?? null,
      categoryName: "coffee table",
    },
    {
      id: "t3",
      designId: "a3f9",
      designVersionId: null,
      furnitureItemId: "f_lamp",
      categoryId: null,
      label: "ল্যাম্প",
      xCoord: 0.78,
      yCoord: 0.3,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      furnitureItem: mockFurniture[2] ?? null,
      categoryName: "lamp",
    },
  ],
};

/** Furniture detail (bottom sheet / modal) with a used-price alternative + similar brands. */
export const mockFurnitureDetail: FurnitureDetail = {
  ...(mockFurniture[0] as FurnitureItem),
  vendor: mockVendors[0] ?? null,
  similar: [
    { id: "f_sofa_otobi", brand: "Otobi", priceBdt: 38500 },
    { id: "f_sofa_regal", brand: "Regal", priceBdt: 35000 },
    { id: "f_sofa_partex", brand: "Partex", priceBdt: 40000 },
  ],
};

/** Used-market alternative shown alongside the new price (Bikroy). */
export const mockUsedAlternative = {
  source: "bikroy" as const,
  priceBdt: 24000,
  listingCount: 3,
  url: "https://bikroy.com",
};

/** A small gallery of saved designs (reuses the same shape). */
export const mockSavedDesigns: DesignWithTags[] = [
  { ...mockDesign, id: "a3f9", style: "modern", isSaved: true },
  { ...mockDesign, id: "b7c2", style: "traditional_bangla", roomType: "bedroom", isSaved: true },
  { ...mockDesign, id: "c1d5", style: "minimal", roomType: "dining_room", isSaved: true },
];
