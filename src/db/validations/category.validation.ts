import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { skipBaseColumns } from "@/db/helpers/base.columns";
import { categories, vendorCategoryMaps } from "@/db/schemas/category.schema";
import { CATEGORY_SOURCES, CATEGORY_STATUSES, ROOM_TYPES } from "@/db/schemas/shared.schema";

/*
 * Category system validations (docs/marketplace-plan.md §3). Admin-owned.
 */

export const CreateCategorySchema = createInsertSchema(categories)
  .omit({ ...skipBaseColumns, id: true })
  .extend({
    // Category names are always English (join key / controlled vocabulary).
    name: z.string().min(1, "Enter a name"),
    roomTypes: z.array(z.enum(ROOM_TYPES)).default([]),
    status: z.enum(CATEGORY_STATUSES).default("active"),
    source: z.enum(CATEGORY_SOURCES).default("manual"),
  });

export const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: z.string().min(1),
});

export const CreateVendorCategoryMapSchema = createInsertSchema(vendorCategoryMaps)
  .omit({ ...skipBaseColumns, id: true })
  .extend({
    vendorId: z.string().min(1),
    rawCategory: z.string().min(1),
    categoryId: z.string().min(1),
    status: z.enum(CATEGORY_STATUSES).default("pending"),
    source: z.enum(CATEGORY_SOURCES).default("ai"),
  });

export const UpdateVendorCategoryMapSchema = CreateVendorCategoryMapSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateVendorCategoryMapInput = z.infer<typeof CreateVendorCategoryMapSchema>;
export type UpdateVendorCategoryMapInput = z.infer<typeof UpdateVendorCategoryMapSchema>;
