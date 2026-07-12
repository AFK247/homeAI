import { relations } from "drizzle-orm";
import { boolean, index, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { baseColumns, numericConfig, relationConfig } from "@/db/helpers/base.columns";
import { users } from "./auth.schema";
import { furnitureItems } from "./furniture.schema";
import { designStyleEnum, generationStatusEnum, roomTypeEnum } from "./shared.schema";

const { id, ...timestampColumns } = baseColumns;
const { cascade, setNull } = relationConfig;

/*
 * designs (plan §3.2). Anonymous-first: exactly one of userId / anonymousId is set;
 * on signup we backfill userId. Unsaved renders auto-expire (expiresAt) per cost control.
 */
export const designs = pgTable(
  "designs",
  {
    id,
    userId: text("user_id").references(() => users.id, cascade), // nullable until signup
    anonymousId: text("anonymous_id"), // anon session cookie id
    originalImageUrl: text("original_image_url").notNull(), // R2 key/url
    generatedImageUrl: text("generated_image_url"), // null until job done
    roomType: roomTypeEnum("room_type").notNull(),
    style: designStyleEnum("style").notNull(),
    prompt: text("prompt"), // user free-text (server prompt stays private)
    isPanorama: boolean("is_panorama").notNull().default(false),
    jobId: text("job_id"), // Fal queue id
    aiProvider: text("ai_provider"), // which provider produced the result
    aiModel: text("ai_model"), // and its model id
    status: generationStatusEnum("status").notNull().default("pending"),
    isSaved: boolean("is_saved").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
    ...timestampColumns,
  },
  (t) => [index("designs_user_idx").on(t.userId), index("designs_anon_idx").on(t.anonymousId)],
);

/*
 * design_tags — clickable furniture pins on the generated image.
 * x/yCoord are 0..1 relative positions.
 */
export const designTags = pgTable(
  "design_tags",
  {
    id,
    designId: text("design_id")
      .notNull()
      .references(() => designs.id, cascade),
    furnitureItemId: text("furniture_item_id").references(() => furnitureItems.id, setNull),
    label: text("label"), // e.g. "সোফা" — shown on the pin before item resolves
    xCoord: numeric("x_coord", numericConfig).notNull(),
    yCoord: numeric("y_coord", numericConfig).notNull(),
    ...timestampColumns,
  },
  (t) => [index("design_tags_design_idx").on(t.designId)],
);

export const designsRelations = relations(designs, ({ one, many }) => ({
  user: one(users, { fields: [designs.userId], references: [users.id] }),
  tags: many(designTags),
}));

export const designTagsRelations = relations(designTags, ({ one }) => ({
  design: one(designs, { fields: [designTags.designId], references: [designs.id] }),
  furnitureItem: one(furnitureItems, {
    fields: [designTags.furnitureItemId],
    references: [furnitureItems.id],
  }),
}));
