"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

/*
 * Language toggle (বাংলা / EN). Writes the `lang` cookie and refreshes so the
 * whole tree re-renders server-side in the chosen locale. Bangla is default.
 */
export function LanguageToggle() {
  const { locale } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex overflow-hidden rounded-full border border-border font-semibold text-xs">
      <button
        type="button"
        onClick={() => setLocale("bn")}
        disabled={pending}
        className={cn(
          "px-3 py-1.5",
          locale === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        disabled={pending}
        className={cn(
          "px-3 py-1.5",
          locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}
