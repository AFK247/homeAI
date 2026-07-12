import { defineConfig } from "drizzle-kit";

/*
 * Drizzle Kit config (plan §3.4). Uses the DIRECT (non-pooled) connection for
 * migrations/push; the app runtime uses the pooled DATABASE_URL via src/db/client.ts.
 */
export default defineConfig({
  schema: "./src/db/schemas/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
