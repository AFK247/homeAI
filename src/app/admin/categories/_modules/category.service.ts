import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import type { SearchParams } from "@/db/helpers/search-params";
import {
  andWhere,
  equalFilters,
  paginate,
  searchFilters,
  sqlCount,
  withSorting,
} from "@/db/helpers/with-filters";
import { categories, vendorCategoryMaps } from "@/db/schemas/category.schema";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/db/validations/category.validation";
import { mapCategories } from "@/server/service/category/category-mapper";
import { SEED_CATEGORIES } from "@/server/service/category/seed-categories";

/*
 * Admin categories service — all Drizzle for the master category vocabulary
 * (docs/marketplace-plan.md §3). List + CRUD + approve (pending→active) + seed.
 * No auth/cache here — that's the router's job.
 */
export const CategoryService = {
  /** Paginated categories (filter by status / source). */
  listPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([categories.name], params.search),
      ...equalFilters({ status: categories.status, source: categories.source }, params.filters),
    ]);
    return paginate(params, db.select(sqlCount()).from(categories).where(where), (limit, offset) =>
      db
        .select()
        .from(categories)
        .where(where)
        .orderBy(
          withSorting(
            { name: categories.name, createdAt: categories.createdAt, status: categories.status },
            params,
            categories.name,
          ),
        )
        .limit(limit)
        .offset(offset),
    );
  },

  /** One category by id, or null. */
  getById: async (id: string) => {
    const [row] = await db.select().from(categories).where(eq(categories.id, id));
    return row ?? null;
  },

  /** Create a category; returns the new row. */
  create: async (input: CreateCategoryInput) => {
    const [row] = await db.insert(categories).values(input).returning();
    return row ?? null;
  },

  /** Update a category by id; returns the updated row (null if it didn't exist). */
  update: async ({ id, ...input }: UpdateCategoryInput) => {
    const [row] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
    return row ?? null;
  },

  /** Approve a pending category (pending → active). */
  approve: async (id: string) => {
    const [row] = await db
      .update(categories)
      .set({ status: "active" })
      .where(eq(categories.id, id))
      .returning();
    return row ?? null;
  },

  /** Soft-ish deactivate — flip isActive off is not modeled here; we hard-delete instead. */
  remove: async (id: string) => {
    const [row] = await db.delete(categories).where(eq(categories.id, id)).returning();
    return row ?? null;
  },

  /**
   * Seed the master list (idempotent). Inserts any SEED_CATEGORIES not already present;
   * skips ones that exist (does not overwrite their roomTypes). Returns how many added.
   */
  seed: async () => {
    const existing = await db
      .select({ name: categories.name })
      .from(categories)
      .where(
        inArray(
          categories.name,
          SEED_CATEGORIES.map((c) => c.name),
        ),
      );
    const have = new Set(existing.map((r) => r.name));
    const toInsert = SEED_CATEGORIES.filter((c) => !have.has(c.name)).map((c) => ({
      name: c.name,
      roomTypes: c.rooms,
      status: "active" as const,
      source: "seed" as const,
    }));
    if (toInsert.length === 0) return { added: 0 };
    await db.insert(categories).values(toInsert);
    return { added: toInsert.length };
  },

  /** All active categories (used by AI mapping + pin classification to know the vocabulary). */
  listActive: async () => {
    return db.select().from(categories).where(eq(categories.status, "active"));
  },

  /**
   * The AI detection targets for a room — the ACTIVE category names whose roomTypes
   * include this room. This is what makes detection dynamic: the vision service reads its
   * targets from here, so adding/room-tagging a category in admin changes what the AI
   * looks for. `sql` array-contains keeps it a single indexed query.
   */
  targetsForRoom: async (roomType: string): Promise<string[]> => {
    const rows = await db
      .select({ name: categories.name })
      .from(categories)
      .where(
        and(
          eq(categories.status, "active"),
          sql`${categories.roomTypes} @> ARRAY[${roomType}]::text[]`,
        ),
      );
    return rows.map((r) => r.name);
  },

  // ── vendor→master category mappings (same admin surface) ───────────────

  /** Paginated vendor→master mappings, with the resolved category name joined in. */
  listMapsPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([vendorCategoryMaps.rawCategory], params.search),
      ...equalFilters(
        { status: vendorCategoryMaps.status, vendorId: vendorCategoryMaps.vendorId },
        params.filters,
      ),
    ]);
    return paginate(
      params,
      db.select(sqlCount()).from(vendorCategoryMaps).where(where),
      (limit, offset) =>
        db
          .select({
            id: vendorCategoryMaps.id,
            vendorId: vendorCategoryMaps.vendorId,
            rawCategory: vendorCategoryMaps.rawCategory,
            categoryId: vendorCategoryMaps.categoryId,
            categoryName: categories.name,
            status: vendorCategoryMaps.status,
            source: vendorCategoryMaps.source,
            createdAt: vendorCategoryMaps.createdAt,
          })
          .from(vendorCategoryMaps)
          .leftJoin(categories, eq(vendorCategoryMaps.categoryId, categories.id))
          .where(where)
          .orderBy(
            withSorting(
              {
                rawCategory: vendorCategoryMaps.rawCategory,
                createdAt: vendorCategoryMaps.createdAt,
              },
              params,
              vendorCategoryMaps.createdAt,
            ),
          )
          .limit(limit)
          .offset(offset),
    );
  },

  /** Approve a pending vendor→master mapping. */
  approveMap: async (id: string) => {
    const [row] = await db
      .update(vendorCategoryMaps)
      .set({ status: "active" })
      .where(eq(vendorCategoryMaps.id, id))
      .returning();
    return row ?? null;
  },

  /** Re-point a mapping to a different master category (admin correction). */
  updateMap: async (id: string, categoryId: string) => {
    const [row] = await db
      .update(vendorCategoryMaps)
      .set({ categoryId })
      .where(eq(vendorCategoryMaps.id, id))
      .returning();
    return row ?? null;
  },

  /** Delete a vendor→master mapping. */
  removeMap: async (id: string) => {
    const [row] = await db
      .delete(vendorCategoryMaps)
      .where(eq(vendorCategoryMaps.id, id))
      .returning();
    return row ?? null;
  },

  /**
   * Phase 3 (docs/marketplace-plan.md §5): AI-map a vendor's raw categories to master
   * categories. Skips raw categories already mapped for this vendor, asks the AI (one
   * batch) to map the rest, creates any proposed NEW master categories as `pending`, and
   * writes each mapping as `pending`. Nothing goes live until an admin approves.
   *
   * Returns a summary the caller/admin can act on.
   */
  mapVendorCategories: async (vendorId: string, rawCategories: string[]) => {
    const raw = [...new Set(rawCategories.map((r) => r.trim()).filter(Boolean))];
    if (raw.length === 0) return { mapped: 0, newCategories: 0, skipped: 0 };

    // Skip raw categories already mapped for this vendor.
    const existingMaps = await db
      .select({ rawCategory: vendorCategoryMaps.rawCategory })
      .from(vendorCategoryMaps)
      .where(eq(vendorCategoryMaps.vendorId, vendorId));
    const alreadyMapped = new Set(existingMaps.map((m) => m.rawCategory));
    const todo = raw.filter((r) => !alreadyMapped.has(r));
    if (todo.length === 0) return { mapped: 0, newCategories: 0, skipped: raw.length };

    // Current master vocabulary (active + pending, so we don't duplicate a pending one).
    const master = await db.select({ name: categories.name }).from(categories);
    const masterNames = master.map((m) => m.name);

    const mappings = await mapCategories(todo, masterNames);

    // Resolve/create master categories, then write the vendor maps — all `pending`.
    const idByName = new Map<string, string>();
    const knownRows = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories);
    for (const row of knownRows) idByName.set(row.name, row.id);

    let newCategories = 0;
    let mapped = 0;
    for (const m of mappings) {
      let categoryId = idByName.get(m.category);
      if (!categoryId) {
        // AI proposed a genuinely new master category → create it as pending.
        const [created] = await db
          .insert(categories)
          .values({ name: m.category, status: "pending", source: "ai" })
          .onConflictDoNothing({ target: categories.name })
          .returning({ id: categories.id });
        if (created) {
          categoryId = created.id;
          newCategories++;
        } else {
          // Lost a race / already exists — look it up.
          const [found] = await db
            .select({ id: categories.id })
            .from(categories)
            .where(eq(categories.name, m.category));
          categoryId = found?.id;
        }
        if (categoryId) idByName.set(m.category, categoryId);
      }
      if (!categoryId) continue;

      await db
        .insert(vendorCategoryMaps)
        .values({ vendorId, rawCategory: m.raw, categoryId, status: "pending", source: "ai" })
        .onConflictDoNothing({
          target: [vendorCategoryMaps.vendorId, vendorCategoryMaps.rawCategory],
        });
      mapped++;
    }

    return { mapped, newCategories, skipped: raw.length - todo.length };
  },
};
