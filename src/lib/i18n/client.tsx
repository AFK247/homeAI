"use client";

import { createContext, useContext } from "react";
import { bn } from "./dictionaries/bn";
import { en } from "./dictionaries/en";
import { DEFAULT_LOCALE, type Dictionary, type Locale } from "./types";

/*
 * Client i18n. I18nProvider (mounted in the root layout with the server-resolved
 * locale) exposes the active dictionary + locale to client components via
 * useTranslation(). Switching writes the `lang` cookie and refreshes so the
 * whole tree (server + client) re-renders in the new language.
 */
const DICTIONARIES: Record<Locale, Dictionary> = { bn, en };

interface I18nValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, dict: bn });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, dict: DICTIONARIES[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation(): I18nValue {
  return useContext(I18nContext);
}
