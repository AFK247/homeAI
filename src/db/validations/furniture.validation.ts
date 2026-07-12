import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { skipBaseColumns } from "@/db/helpers/base.columns";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import { FURNITURE_CONDITIONS, FURNITURE_SOURCES } from "@/db/schemas/shared.schema";

/*
 * Furniture validations (plan §4). Used by the admin catalog CRUD.
 */

export const DimensionsSchema = z.object({
  width: z.number().nonnegative().optional(),
  height: z.number().nonnegative().optional(),
  depth: z.number().nonnegative().optional(),
  unit: z.enum(["in", "cm"]).default("in"),
});

export const CreateFurnitureSchema = createInsertSchema(furnitureItems)
  .omit({ ...skipBaseColumns, id: true })
  .extend({
    name: z.string().min(1, "নাম দিন"),
    priceBdt: z.number().nonnegative().optional(),
    dimensions: DimensionsSchema.optional(),
    condition: z.enum(FURNITURE_CONDITIONS),
    source: z.enum(FURNITURE_SOURCES),
  });

export const UpdateFurnitureSchema = CreateFurnitureSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateFurnitureInput = z.infer<typeof CreateFurnitureSchema>;
export type UpdateFurnitureInput = z.infer<typeof UpdateFurnitureSchema>;
export type DimensionsInput = z.infer<typeof DimensionsSchema>;
