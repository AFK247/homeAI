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

/** Format a BDT amount as "৳ ৪২,০০০" (Bengali digits, grouped). */
export function formatBdt(amount: number, withSymbol = true): string {
  const grouped = new Intl.NumberFormat("en-US").format(Math.round(amount));
  const bn = toBnDigits(grouped);
  return withSymbol ? `৳ ${bn}` : bn;
}
