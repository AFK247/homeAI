/*
 * Centralized route registry (reference convention: config/pages.ts).
 *
 * The single source of truth for every route in the app. Static routes are
 * string constants; dynamic routes are functions that build the path. Import
 * PAGES everywhere instead of hardcoding path strings, so routes are typo-proof
 * and refactorable from one place.
 *
 *   <Link href={PAGES.CREATE.INDEX}>          // static
 *   router.replace(PAGES.RESULT.VIEW(id))     // dynamic
 */
export const PAGES = {
  HOME: "/",

  CREATE: {
    INDEX: "/create",
    STYLE: "/create/style",
    GENERATING: "/create/generating",
  },

  RESULT: {
    VIEW: (designId: string) => `/result/${designId}`,
  },

  DESIGNS: "/designs",
  PRICING: "/pricing",
  LOGIN: "/login",

  ADMIN: {
    INDEX: "/admin",
    DESIGNS: "/admin/designs",
    SESSIONS: "/admin/sessions",
    EVENTS: "/admin/events",
    FURNITURE: "/admin/furniture",
    VENDORS: "/admin/vendors",
    PROVIDER: "/admin/provider",
  },

  API: {
    RPC: "/api/rpc",
  },
} as const;
