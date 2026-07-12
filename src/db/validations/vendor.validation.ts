import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { skipBaseColumns } from "@/db/helpers/base.columns";
import { VENDOR_TYPES } from "@/db/schemas/shared.schema";
import { vendors } from "@/db/schemas/vendor.schema";

/*
 * Vendor validations (plan §4). Admin-owned.
 */

export const CreateVendorSchema = createInsertSchema(vendors)
  .omit({ ...skipBaseColumns, id: true })
  .extend({
    name: z.string().min(1, "নাম দিন"),
    type: z.enum(VENDOR_TYPES),
    commissionRate: z.number().min(0).max(100).optional(),
  });

export const UpdateVendorSchema = CreateVendorSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateVendorInput = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorInput = z.infer<typeof UpdateVendorSchema>;
