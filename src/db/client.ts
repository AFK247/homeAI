import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

/*
 * Drizzle client (plan §3.3). A single pooled node-postgres connection, reused
 * across HMR reloads via a global guard so dev doesn't leak connections.
 *
 * Runtime uses the pooled DATABASE_URL; migrations/push use DIRECT_URL via
 * drizzle.config.ts. `casing: 'snake_case'` matches the schema definitions.
 */

const globalForDb = globalThis as unknown as { __homeaiPool__?: Pool };

const pool = globalForDb.__homeaiPool__ ?? new Pool({ connectionString: env.DATABASE_URL });

if (env.NODE_ENV !== "production") {
  globalForDb.__homeaiPool__ = pool;
}

export const db = drizzle(pool, { schema, casing: "snake_case" });
