/*
 * Schema barrel (plan §3). Aggregates all tables, relations, and enums for the Drizzle
 * client's `import * as schema` namespace. Prefer per-file imports elsewhere
 * (`@/db/schemas/design.schema`); this barrel exists mainly for the client + drizzle-kit.
 */
export * from "./schemas/auth.schema";
export * from "./schemas/billing.schema";
export * from "./schemas/category.schema";
export * from "./schemas/design.schema";
export * from "./schemas/event.schema";
export * from "./schemas/furniture.schema";
export * from "./schemas/generation-log.schema";
export * from "./schemas/shared.schema";
export * from "./schemas/usage.schema";
export * from "./schemas/vendor.schema";
