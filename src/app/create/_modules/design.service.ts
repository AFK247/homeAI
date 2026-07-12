import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { designs } from "@/db/schemas/design.schema";
import type { DesignStyle, RoomType } from "@/db/schemas/shared.schema";

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
    return row ?? null;
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
  }: {
    id: string;
    generatedImageUrl: string | null;
    status: "done" | "failed";
  } & Scope) => {
    const [row] = await db
      .update(designs)
      .set({ generatedImageUrl, status })
      .where(and(eq(designs.id, id), eq(designs.anonymousId, anonymousId)))
      .returning();
    return row ?? null;
  },
};

export type DesignRow = Awaited<ReturnType<typeof DesignService.getById>>;
