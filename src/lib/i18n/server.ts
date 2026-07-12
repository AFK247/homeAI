import "server-only";

import { cookies } from "next/headers";
import { bn } from "./dictionaries/bn";
import { en } from "./dictionaries/en";
import { DEFAULT_LOCALE, type Dictionary, LOCALE_COOKIE, type Locale } from "./types";

/*
 * Server-side i18n. Reads the `lang` cookie to pick the active locale, and
 * exposes the matching dictionary. Used by Server Components and to seed the
 * client I18nProvider.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { bn, en };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return value === "en" || value === "bn" ? value : DEFAULT_LOCALE;
}

export async function getDictionary(): Promise<{ locale: Locale; dict: Dictionary }> {
  const locale = await getLocale();
  return { locale, dict: DICTIONARIES[locale] };
}
