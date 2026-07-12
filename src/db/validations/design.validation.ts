import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { skipBaseColumnsWithUserId } from "@/db/helpers/base.columns";
import { designs } from "@/db/schemas/design.schema";
import { DESIGN_STYLES, ROOM_TYPES } from "@/db/schemas/shared.schema";

/*
 * Design validations (plan §4). Seeded from the Drizzle table via drizzle-zod, then refined.
 * One schema validates both server (.input) and client (zodResolver). z.infer → *Input types.
 */

/** The create-a-design payload sent from the client to start a generation. */
export const CreateDesignSchema = createInsertSchema(designs)
  .omit({
    ...skipBaseColumnsWithUserId,
    id: true,
    anonymousId: true,
    status: true,
    jobId: true,
    generatedImageUrl: true,
    expiresAt: true,
    isSaved: true,
  })
  .extend({
    prompt: z.string().max(500).optional(),
  });

/** Narrow input for polling a job's status. */
export const GenerateStatusSchema = z.object({
  designId: z.string().min(1),
});

/** Style-picker form (client-side only shape). */
export const StyleSelectionSchema = z.object({
  style: z.enum(DESIGN_STYLES),
  budget: z.enum(["low", "medium", "premium"]).default("medium"),
  prompt: z.string().max(500).optional(),
});

/** Upload-step form. */
export const UploadSelectionSchema = z.object({
  roomType: z.enum(ROOM_TYPES),
  isPanorama: z.boolean().default(false),
});

export type CreateDesignInput = z.infer<typeof CreateDesignSchema>;
export type GenerateStatusInput = z.infer<typeof GenerateStatusSchema>;
export type StyleSelectionInput = z.infer<typeof StyleSelectionSchema>;
export type UploadSelectionInput = z.infer<typeof UploadSelectionSchema>;
