import "server-only";

import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schemas/category.schema";
import { designs, designTags, designVersions } from "@/db/schemas/design.schema";
import { furnitureItems } from "@/db/schemas/furniture.schema";
import type { DesignStyle, Region, RoomType } from "@/db/schemas/shared.schema";
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

  /**
   * Update a design's editable parameters (room / style / prompt / panorama), scoped to
   * the session. Used when the user tweaks controls on the result screen and regenerates —
   * the new render then reflects the changed settings. Only provided fields change.
   */
  updateParams: async ({
    id,
    anonymousId,
    roomType,
    style,
    prompt,
    isPanorama,
  }: { id: string } & Scope & {
      roomType?: RoomType;
      style?: DesignStyle;
      prompt?: string | null;
      isPanorama?: boolean;
    }) => {
    const [row] = await db
      .update(designs)
      .set({
        ...(roomType !== undefined && { roomType }),
        ...(style !== undefined && { style }),
        ...(prompt !== undefined && { prompt }),
        ...(isPanorama !== undefined && { isPanorama }),
      })
      .where(and(eq(designs.anonymousId, anonymousId), eq(designs.id, id)))
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

    // Pins are per-version: show only the ACTIVE version's pins so switching
    // versions shows the matching furniture positions (not stale ones).
    const [activeVersion] = await db
      .select({ id: designVersions.id })
      .from(designVersions)
      .where(and(eq(designVersions.designId, row.id), eq(designVersions.isActive, true)));

    // Resolve the active version's pins to their catalog items (DesignWithTags).
    // Fall back to designId for legacy rows with no version link.
    const tagRows = activeVersion
      ? await db.select().from(designTags).where(eq(designTags.designVersionId, activeVersion.id))
      : await db
          .select()
          .from(designTags)
          .where(and(eq(designTags.designId, row.id), isNull(designTags.designVersionId)));

    const itemIds = tagRows.map((t) => t.furnitureItemId).filter((v): v is string => v !== null);
    const items = itemIds.length
      ? await db.select().from(furnitureItems).where(inArray(furnitureItems.id, itemIds))
      : [];
    const itemById = new Map(items.map((i) => [i.id, i]));

    // Category name per pin (what the pin/list label shows and what the modal queries by).
    const catIds = tagRows.map((t) => t.categoryId).filter((v): v is string => v !== null);
    const cats = catIds.length
      ? await db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(inArray(categories.id, catIds))
      : [];
    const catNameById = new Map(cats.map((c) => [c.id, c.name]));

    const tags = tagRows.map((t) => ({
      ...t,
      furnitureItem: t.furnitureItemId ? (itemById.get(t.furnitureItemId) ?? null) : null,
      categoryName: t.categoryId ? (catNameById.get(t.categoryId) ?? null) : null,
    }));

    return { ...resolveUrls(row), tags };
  },

  /**
   * Store the furniture pins detected for ONE version of a design, resolving each pin to
   * a master category and (when the catalog has one) a real product — the "shop similar"
   * link (docs/marketplace-plan.md §5, Phases 5–6).
   *
   * Each pin's `label` is an exact master-category name (ROOM_TARGETS is kept aligned to
   * the vocabulary), so we resolve label → categoryId, then pick a catalog item in that
   * category and the viewer's region. `furnitureItemId` stays null when nothing matches.
   *
   * Scoped to the version, not the design: every render places furniture differently,
   * so each version owns its own pins and switching versions shows the right ones.
   * Clears this version's prior pins first so a re-detect doesn't stack.
   */
  setVisionTags: async (
    designId: string,
    designVersionId: string,
    pins: { label: string; xPct: number; yPct: number }[],
    region: Region = "bd",
  ) => {
    await db.delete(designTags).where(eq(designTags.designVersionId, designVersionId));
    if (pins.length === 0) return;

    // Resolve each distinct label → an ACTIVE master category id (labels are master names).
    const labels = [...new Set(pins.map((p) => p.label.toLowerCase()))];
    const cats = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(and(inArray(categories.name, labels), eq(categories.status, "active")));
    const catIdByName = new Map(cats.map((c) => [c.name, c.id]));

    // For each resolved category, pick one representative product in this region to link
    // the pin to (cheapest first — a reasonable default "shop similar" entry point).
    const catIds = [...new Set([...catIdByName.values()])];
    const itemByCat = new Map<string, string>();
    if (catIds.length > 0) {
      const items = await db
        .select({ id: furnitureItems.id, categoryId: furnitureItems.categoryId })
        .from(furnitureItems)
        .where(
          and(
            inArray(furnitureItems.categoryId, catIds),
            eq(furnitureItems.region, region),
            eq(furnitureItems.isActive, true),
          ),
        )
        .orderBy(furnitureItems.priceBdt);
      for (const it of items) {
        if (it.categoryId && !itemByCat.has(it.categoryId)) itemByCat.set(it.categoryId, it.id);
      }
    }

    await db.insert(designTags).values(
      pins.map((p) => {
        const categoryId = catIdByName.get(p.label.toLowerCase()) ?? null;
        return {
          designId,
          designVersionId,
          categoryId,
          furnitureItemId: categoryId ? (itemByCat.get(categoryId) ?? null) : null,
          label: p.label,
          // The UI positions pins with 0..1 relative coords; the detector reports 0..100.
          xCoord: p.xPct / 100,
          yCoord: p.yPct / 100,
        };
      }),
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
