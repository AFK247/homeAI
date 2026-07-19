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
  },

  RESULT: {
    VIEW: (designId: string) => `/result/${designId}`,
  },

  // Public, read-only share page — safe to hand to anyone (see design.service getPublicById).
  SHARE: {
    VIEW: (designId: string) => `/share/${designId}`,
  },

  DESIGNS: "/designs",
  PRICING: "/pricing",
  PAYMENT_RESULT: "/payment/result",
  LOGIN: "/login",
  ACCOUNT: "/account",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  ADMIN: {
    INDEX: "/admin",
    DESIGNS: "/admin/designs",
    SESSIONS: "/admin/sessions",
    EVENTS: "/admin/events",
    FURNITURE: "/admin/furniture",
    CATEGORIES: "/admin/categories",
    CATEGORY_MAPPINGS: "/admin/categories/mappings",
    VENDORS: "/admin/vendors",
    CATALOG: "/admin/catalog",
    PROVIDER: "/admin/provider",
    GENERATIONS: "/admin/generations",
    DESIGN_DETAIL: (id: string) => `/admin/designs/${id}`,
    GENERATION_DETAIL: (id: string) => `/admin/generations/${id}`,
  },

  API: {
    RPC: "/api/rpc",
    PAYMENT: {
      SUCCESS: "/api/payments/sslcommerz/success",
      FAIL: "/api/payments/sslcommerz/fail",
      CANCEL: "/api/payments/sslcommerz/cancel",
      IPN: "/api/payments/sslcommerz/ipn",
    },
  },
} as const;
