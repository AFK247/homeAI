import type { LucideIcon } from "lucide-react";

/** A headline metric tile for the admin overview. */
export function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card p-5 shadow-sm">
      <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <div className="font-serif font-extrabold text-2xl text-foreground">{value}</div>
        <div className="text-brand-body text-xs">{label}</div>
      </div>
    </div>
  );
}
