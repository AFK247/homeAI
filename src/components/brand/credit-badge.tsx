"use client";

import type { CreditState } from "@/db/types";
import { toBnDigits } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Free-credit dot meter + label (design §7b): "4 free left". */
export function CreditBadge({ credit }: { credit: CreditState }) {
  const { dict, locale } = useTranslation();
  const remaining = Math.max(0, credit.freeLimit - credit.freeUsed);
  const num = locale === "bn" ? toBnDigits(remaining) : String(remaining);
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
      <div className="flex gap-1">
        {Array.from({ length: credit.freeLimit }, (_, i) => i).map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i < remaining ? "bg-primary" : "bg-primary/30",
            )}
          />
        ))}
      </div>
      <span className="font-bold text-[11px] text-secondary-foreground">
        {num}
        {dict.credit.freeLeft}
      </span>
    </div>
  );
}
