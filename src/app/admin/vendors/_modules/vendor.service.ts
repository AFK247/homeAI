import "server-only";

import { eq } from "drizzle-orm";
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
import { vendors } from "@/db/schemas/vendor.schema";
import type { CreateVendorInput, UpdateVendorInput } from "@/db/validations/vendor.validation";

/*
 * Admin vendors service — all Drizzle for the vendors entity (list + CRUD).
 * Backend search / filter / sort / pagination for the URL-driven DataTable, and the
 * create/update/delete writes. No auth or cache here — that's the router's job.
 */
export const VendorService = {
  /** Paginated vendors (filter by type). */
  listPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([vendors.name, vendors.type], params.search),
      ...equalFilters({ type: vendors.type }, params.filters),
    ]);
    return paginate(params, db.select(sqlCount()).from(vendors).where(where), (limit, offset) =>
      db
        .select()
        .from(vendors)
        .where(where)
        .orderBy(
          withSorting(
            { name: vendors.name, createdAt: vendors.createdAt },
            params,
            vendors.createdAt,
          ),
        )
        .limit(limit)
        .offset(offset),
    );
  },

  /** One vendor by id, or null. */
  getById: async (id: string) => {
    const [row] = await db.select().from(vendors).where(eq(vendors.id, id));
    return row ?? null;
  },

  /** Create a vendor; returns the new row. */
  create: async (input: CreateVendorInput) => {
    const [row] = await db.insert(vendors).values(input).returning();
    return row ?? null;
  },

  /** Update a vendor by id; returns the updated row (null if it didn't exist). */
  update: async ({ id, ...input }: UpdateVendorInput) => {
    const [row] = await db.update(vendors).set(input).where(eq(vendors.id, id)).returning();
    return row ?? null;
  },

  /** Delete a vendor by id; returns the removed row (null if it didn't exist). */
  remove: async (id: string) => {
    const [row] = await db.delete(vendors).where(eq(vendors.id, id)).returning();
    return row ?? null;
  },
};
