"use client";

import { toBnDigits } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { CreditBalance } from "@/server/service/credit/credit.service";

/** Credit balance pill (docs/CREDIT_SYSTEM.md): shows the user's spendable credits (free+paid). */
export function CreditBadge({ credit }: { credit: CreditBalance }) {
  const { dict, locale } = useTranslation();
  const num = locale === "bn" ? toBnDigits(credit.total) : String(credit.total);
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5",
        credit.total === 0 && "opacity-70",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="font-bold text-[11px] text-secondary-foreground">
        {num}
        {dict.credit.freeLeft}
      </span>
    </div>
  );
}
