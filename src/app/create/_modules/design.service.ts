import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { designs, designTags, designVersions } from "@/db/schemas/design.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import type { PlannedTag } from "@/server/service/furniture.service";
import { StorageService } from "@/server/service/storage/storage.service";

/*
 * Design service (plan §5.1). All Drizzle for designs lives here. Every query is
 * scoped by `anonymousId` (until auth) and filters out soft-deleted rows.
 * Returns null (not undefined) for misses. No auth/cache/cookies here.
 */

interface Scope {
  anonymousId: string;
}

/**
 * Resolve a design row's stored KEYS into full public URLs at read time. The DB
 * holds env-agnostic keys; the base URL (env-specific) is joined on here so the
 * UI always gets a ready-to-render `src`.
 */
function resolveUrls<T extends { originalImageUrl: string; generatedImageUrl: string | null }>(
  row: T,
): T {
  return {
    ...row,
    originalImageUrl: StorageService.publicUrl(row.originalImageUrl) ?? "",
    generatedImageUrl: StorageService.publicUrl(row.generatedImageUrl),
  };
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

    return { ...resolveUrls(row), tags };
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
    const rows = await db
      .select()
      .from(designs)
      .where(and(eq(designs.anonymousId, anonymousId), isNull(designs.deletedAt)))
      .orderBy(desc(designs.createdAt));
    return rows.map(resolveUrls);
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

  /**
   * Record a new generated image as the ACTIVE version (first render or a
   * regenerate). Deactivates prior versions so exactly one is active.
   */
  addVersion: async ({
    designId,
    imageUrl,
    aiProvider,
    aiModel,
  }: {
    designId: string;
    imageUrl: string;
    aiProvider?: string | null;
    aiModel?: string | null;
  }) => {
    await db
      .update(designVersions)
      .set({ isActive: false })
      .where(eq(designVersions.designId, designId));
    const [row] = await db
      .insert(designVersions)
      .values({ designId, imageUrl, aiProvider: aiProvider ?? null, aiModel: aiModel ?? null })
      .returning();
    return row ?? null;
  },

  /** All versions of a design, newest first, with image URLs resolved. */
  listVersions: async ({ designId, anonymousId }: { designId: string } & Scope) => {
    // Scope through the parent design so a user only sees their own versions.
    const [owned] = await db
      .select({ id: designs.id })
      .from(designs)
      .where(and(eq(designs.id, designId), eq(designs.anonymousId, anonymousId)));
    if (!owned) return [];
    const rows = await db
      .select()
      .from(designVersions)
      .where(eq(designVersions.designId, designId))
      .orderBy(desc(designVersions.createdAt));
    return rows.map((v) => ({ ...v, imageUrl: StorageService.publicUrl(v.imageUrl) ?? "" }));
  },

  /** Make a specific version active + point the design's generatedImageUrl at it. */
  activateVersion: async ({
    designId,
    versionId,
    anonymousId,
  }: { designId: string; versionId: string } & Scope) => {
    const [owned] = await db
      .select()
      .from(designs)
      .where(and(eq(designs.id, designId), eq(designs.anonymousId, anonymousId)));
    if (!owned) return null;
    const [version] = await db
      .select()
      .from(designVersions)
      .where(and(eq(designVersions.id, versionId), eq(designVersions.designId, designId)));
    if (!version) return null;

    await db
      .update(designVersions)
      .set({ isActive: false })
      .where(eq(designVersions.designId, designId));
    await db.update(designVersions).set({ isActive: true }).where(eq(designVersions.id, versionId));
    await db
      .update(designs)
      .set({
        generatedImageUrl: version.imageUrl,
        aiProvider: version.aiProvider,
        aiModel: version.aiModel,
      })
      .where(eq(designs.id, designId));
    return version;
  },
};

export type DesignRow = Awaited<ReturnType<typeof DesignService.getById>>;
