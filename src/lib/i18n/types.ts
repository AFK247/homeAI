import type { bn } from "./dictionaries/bn";

/*
 * i18n core types. The Dictionary shape is INFERRED from the Bengali dictionary
 * (golden rule: never hand-write a type you can infer), so en.ts must match bn.ts
 * key-for-key or it won't typecheck.
 */
export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "bn";
export const LOCALE_COOKIE = "lang";

/**
 * Dictionary shape: the key structure of `bn`, but every leaf widened to string.
 * This lets `en` (and future locales) use their own values while still being
 * forced to provide EVERY key that `bn` defines.
 */
export type Dictionary = {
  [Section in keyof typeof bn]: {
    [Key in keyof (typeof bn)[Section]]: string;
  };
};
