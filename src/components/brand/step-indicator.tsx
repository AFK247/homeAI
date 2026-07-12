import { toBnDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "ছবি" },
  { n: 2, label: "স্টাইল" },
  { n: 3, label: "নতুন ঘর" },
];

/** Flow step indicator (design): ১ ছবি › ২ স্টাইল › ৩ নতুন ঘর. */
export function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <span className={cn(s.n === current ? "font-bold text-primary" : "")}>
            {toBnDigits(s.n)} {s.label}
          </span>
          {i < STEPS.length - 1 ? <span className="text-brand-faint">›</span> : null}
        </div>
      ))}
    </div>
  );
}
