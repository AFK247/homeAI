/*
 * Bangla-first formatting helpers (plan §8, PROJECT_CONTEXT §8).
 * Bengali numerals + BDT (৳) currency, matching the design.
 */

const EN_TO_BN_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

/** Convert ASCII digits in a string to Bengali digits. */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => EN_TO_BN_DIGITS[d] ?? d);
}

/** Render a number's digits in the given locale (Bengali for bn, ASCII for en). */
export function localeDigits(input: string | number, locale: "bn" | "en" = "bn"): string {
  return locale === "bn" ? toBnDigits(input) : String(input);
}

/**
 * Format a BDT amount as "৳ ৪২,০০০" (bn) or "৳ 42,000" (en). The ৳ symbol is
 * kept in both locales — it's the currency mark, not language-specific.
 */
export function formatBdt(amount: number, locale: "bn" | "en" = "bn", withSymbol = true): string {
  const grouped = new Intl.NumberFormat("en-US").format(Math.round(amount));
  const digits = localeDigits(grouped, locale);
  return withSymbol ? `৳ ${digits}` : digits;
}
