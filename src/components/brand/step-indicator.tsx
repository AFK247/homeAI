"use client";

import { toBnDigits } from "@/lib/format";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Flow step indicator (design): 1 Photo › 2 Style › 3 New room. */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const { dict, locale } = useTranslation();
  const steps = [
    { n: 1, label: dict.steps.photo },
    { n: 2, label: dict.steps.style },
    { n: 3, label: dict.steps.newRoom },
  ];
  const num = (n: number) => (locale === "bn" ? toBnDigits(n) : String(n));

  return (
    <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <span className={cn(s.n === current ? "font-bold text-primary" : "")}>
            {num(s.n)} {s.label}
          </span>
          {i < steps.length - 1 ? <span className="text-brand-faint">›</span> : null}
        </div>
      ))}
    </div>
  );
}
