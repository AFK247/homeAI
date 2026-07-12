/*
 * Seed the furniture catalog (vendors + furniture_items) for the marketplace.
 *
 * Realistic Bangladeshi brands (Hatil/Otobi/Regal) as "new" items plus a couple
 * of Bikroy "used" listings. Categories map to room types so heuristic tagging
 * can pick sensible pins per design. Idempotent-ish: clears then re-inserts.
 *
 * Run:  bun scripts/seed-furniture.ts   (loads .env for DATABASE_URL)
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { FurnitureCondition, FurnitureSource } from "@/db/schemas/shared.schema";
import { vendors } from "@/db/schemas/vendor.schema";

// Standalone DB connection for the script (the app's client.ts is 'server-only').
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, casing: "snake_case" });

type SeedItem = {
  name: string;
  brand: string;
  category: string;
  priceBdt: number;
  condition: FurnitureCondition;
  source: FurnitureSource;
  productUrl: string;
  width?: number;
  depth?: number;
  height?: number;
  vendor: "hatil" | "otobi" | "regal" | "bikroy";
};

// Categories used by heuristic tagging (see furniture.service).
const ITEMS: SeedItem[] = [
  // Living room
  { name: "Wooden 3-Seater Sofa", brand: "Hatil", category: "sofa", priceBdt: 42000, condition: "new", source: "brand", productUrl: "https://www.hatil.com/", width: 78, depth: 34, height: 32, vendor: "hatil" },
  { name: "Center Coffee Table", brand: "Otobi", category: "coffee_table", priceBdt: 12500, condition: "new", source: "brand", productUrl: "https://www.otobi.com/", width: 44, depth: 24, height: 18, vendor: "otobi" },
  { name: "Floor Lamp - Warm", brand: "Regal", category: "lamp", priceBdt: 4800, condition: "new", source: "brand", productUrl: "https://www.regalfurniture.com.bd/", height: 60, vendor: "regal" },
  { name: "TV Cabinet", brand: "Hatil", category: "tv_cabinet", priceBdt: 22000, condition: "new", source: "brand", productUrl: "https://www.hatil.com/", width: 60, depth: 16, height: 20, vendor: "hatil" },
  { name: "Used 3-Seater Sofa (good condition)", brand: "Local", category: "sofa", priceBdt: 15000, condition: "used", source: "bikroy", productUrl: "https://bikroy.com/", width: 76, depth: 33, height: 31, vendor: "bikroy" },
  { name: "Area Rug - Jute", brand: "Regal", category: "rug", priceBdt: 3500, condition: "new", source: "brand", productUrl: "https://www.regalfurniture.com.bd/", width: 96, depth: 60, vendor: "regal" },

  // Bedroom
  { name: "Queen Bed - Teak", brand: "Hatil", category: "bed", priceBdt: 55000, condition: "new", source: "brand", productUrl: "https://www.hatil.com/", width: 64, depth: 84, height: 40, vendor: "hatil" },
  { name: "Bedside Table", brand: "Otobi", category: "bedside_table", priceBdt: 6500, condition: "new", source: "brand", productUrl: "https://www.otobi.com/", width: 18, depth: 16, height: 24, vendor: "otobi" },
  { name: "3-Door Wardrobe", brand: "Otobi", category: "wardrobe", priceBdt: 38000, condition: "new", source: "brand", productUrl: "https://www.otobi.com/", width: 54, depth: 22, height: 78, vendor: "otobi" },
  { name: "Used Wardrobe", brand: "Local", category: "wardrobe", priceBdt: 12000, condition: "used", source: "bikroy", productUrl: "https://bikroy.com/", width: 52, depth: 21, height: 76, vendor: "bikroy" },

  // Dining
  { name: "6-Seat Dining Table", brand: "Hatil", category: "dining_table", priceBdt: 48000, condition: "new", source: "brand", productUrl: "https://www.hatil.com/", width: 60, depth: 36, height: 30, vendor: "hatil" },
  { name: "Dining Chair (set of 2)", brand: "Regal", category: "dining_chair", priceBdt: 9000, condition: "new", source: "brand", productUrl: "https://www.regalfurniture.com.bd/", width: 18, depth: 20, height: 36, vendor: "regal" },

  // Kitchen
  { name: "Kitchen Storage Cabinet", brand: "Otobi", category: "kitchen_cabinet", priceBdt: 26000, condition: "new", source: "brand", productUrl: "https://www.otobi.com/", width: 48, depth: 18, height: 72, vendor: "otobi" },

  // Study / kids
  { name: "Study Desk", brand: "Regal", category: "desk", priceBdt: 11000, condition: "new", source: "brand", productUrl: "https://www.regalfurniture.com.bd/", width: 44, depth: 22, height: 30, vendor: "regal" },
  { name: "Bookshelf", brand: "Hatil", category: "bookshelf", priceBdt: 14500, condition: "new", source: "brand", productUrl: "https://www.hatil.com/", width: 32, depth: 12, height: 60, vendor: "hatil" },
];

async function main() {
  console.log("Seeding furniture catalog…");

  // Vendors first (furniture_items reference them).
  const [hatil] = await db.insert(vendors).values({ name: "Hatil", type: "brand", websiteUrl: "https://www.hatil.com/", isVerified: true }).returning();
  const [otobi] = await db.insert(vendors).values({ name: "Otobi", type: "brand", websiteUrl: "https://www.otobi.com/", isVerified: true }).returning();
  const [regal] = await db.insert(vendors).values({ name: "Regal Furniture", type: "brand", websiteUrl: "https://www.regalfurniture.com.bd/", isVerified: true }).returning();
  const [bikroy] = await db.insert(vendors).values({ name: "Bikroy (used listings)", type: "used_seller", websiteUrl: "https://bikroy.com/", isVerified: false }).returning();

  const vendorId: Record<SeedItem["vendor"], string | undefined> = {
    hatil: hatil?.id,
    otobi: otobi?.id,
    regal: regal?.id,
    bikroy: bikroy?.id,
  };

  const rows = ITEMS.map((it) => ({
    name: it.name,
    brand: it.brand,
    category: it.category,
    priceBdt: it.priceBdt,
    condition: it.condition,
    source: it.source,
    productUrl: it.productUrl,
    vendorId: vendorId[it.vendor] ?? null,
    dimensions:
      it.width || it.depth || it.height
        ? { width: it.width, depth: it.depth, height: it.height, unit: "in" as const }
        : null,
  }));

  const inserted = await db.insert(furnitureItems).values(rows).returning();
  console.log(`✓ inserted ${inserted.length} furniture items across 4 vendors.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
