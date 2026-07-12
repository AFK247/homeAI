import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { designs, designTags } from "@/db/schemas/design.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import type { PlannedTag } from "@/server/service/furniture.service";

/*
 * Design service (plan §5.1). All Drizzle for designs lives here. Every query is
 * scoped by `anonymousId` (until auth) and filters out soft-deleted rows.
 * Returns null (not undefined) for misses. No auth/cache/cookies here.
 */

interface Scope {
  anonymousId: string;
}

interface CreateInput extends Scope {
  originalImageUrl: string;
  roomType: RoomType;
  style: DesignStyle;
  prompt?: string | null;
  isPanorama?: boolean;
}

export const DesignService = {
  create: async (input: CreateInput) => {
    const [row] = await db
      .insert(designs)
      .values({
        anonymousId: input.anonymousId,
        originalImageUrl: input.originalImageUrl,
        roomType: input.roomType,
        style: input.style,
        prompt: input.prompt ?? null,
        isPanorama: input.isPanorama ?? false,
        status: "processing",
      })
      .returning();
    return row ?? null;
  },

  getById: async ({ id, anonymousId }: { id: string } & Scope) => {
    const [row] = await db
      .select()
      .from(designs)
      .where(
        and(eq(designs.id, id), eq(designs.anonymousId, anonymousId), isNull(designs.deletedAt)),
      );
    if (!row) return null;

    // Resolve the design's pins to their catalog items (DesignWithTags).
    const tagRows = await db.select().from(designTags).where(eq(designTags.designId, row.id));

    const itemIds = tagRows.map((t) => t.furnitureItemId).filter((v): v is string => v !== null);
    const items = itemIds.length
      ? await db.select().from(furnitureItems).where(inArray(furnitureItems.id, itemIds))
      : [];
    const itemById = new Map(items.map((i) => [i.id, i]));

    const tags = tagRows.map((t) => ({
      ...t,
      furnitureItem: t.furnitureItemId ? (itemById.get(t.furnitureItemId) ?? null) : null,
    }));

    return { ...row, tags };
  },

  /** Insert the planned pins for a design (called after generation). */
  createTags: async (designId: string, planned: PlannedTag[]) => {
    if (planned.length === 0) return;
    await db.insert(designTags).values(
      planned.map((p) => ({
        designId,
        furnitureItemId: p.furnitureItemId,
        label: p.label,
        xCoord: p.xCoord,
        yCoord: p.yCoord,
      })),
    );
  },

  listByAnon: async ({ anonymousId }: Scope) => {
    return db
      .select()
      .from(designs)
      .where(and(eq(designs.anonymousId, anonymousId), isNull(designs.deletedAt)))
      .orderBy(desc(designs.createdAt));
  },

  setResult: async ({
    id,
    anonymousId,
    generatedImageUrl,
    status,
    aiProvider,
    aiModel,
  }: {
    id: string;
    generatedImageUrl: string | null;
    status: "done" | "failed";
    aiProvider?: string | null;
    aiModel?: string | null;
  } & Scope) => {
    const [row] = await db
      .update(designs)
      .set({ generatedImageUrl, status, aiProvider: aiProvider ?? null, aiModel: aiModel ?? null })
      .where(and(eq(designs.id, id), eq(designs.anonymousId, anonymousId)))
      .returning();
    return row ?? null;
  },
};

export type DesignRow = Awaited<ReturnType<typeof DesignService.getById>>;
