"use client";

import { Check } from "lucide-react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { BUDGET_OPTIONS, ROOM_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/*
 * Reusable design-parameter controls, shared by the create and result routes so the
 * user configures/edits room / style / budget / prompt in exactly one place. Presentation
 * only — value + onChange come from the parent (Zustand on create, local state on result).
 * Compact (2-up style cards, tight spacing) so they fit the workspace's controls panel.
 */

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 font-bold text-foreground text-sm">{children}</h3>;
}

export function RoomControl({
  value,
  onChange,
  disabled,
}: {
  value: RoomType;
  onChange: (v: RoomType) => void;
  disabled?: boolean;
}) {
  const { locale, dict } = useTranslation();
  return (
    <div>
      <Label>{dict.upload.roomType}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ROOM_OPTIONS.map((room) => {
          const on = value === room.value;
          return (
            <button
              type="button"
              key={room.value}
              disabled={disabled}
              onClick={() => onChange(room.value)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-xl border-[1.5px] px-2 py-2.5 text-center font-semibold text-sm transition-colors disabled:opacity-60",
                on
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border text-foreground hover:border-primary/50",
              )}
            >
              {room[locale]}
              {on ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StyleControl({
  value,
  onChange,
  disabled,
}: {
  value: DesignStyle;
  onChange: (v: DesignStyle) => void;
  disabled?: boolean;
}) {
  const { dict, locale } = useTranslation();
  return (
    <div>
      <Label>{dict.style.title}</Label>
      <div className="grid grid-cols-3 gap-2">
        {STYLE_OPTIONS.map((s) => {
          const on = value === s.value;
          return (
            <button
              type="button"
              key={s.value}
              disabled={disabled}
              onClick={() => onChange(s.value)}
              className={cn(
                "overflow-hidden rounded-xl border-[1.5px] text-left transition-colors disabled:opacity-60",
                on ? "border-primary shadow-sm" : "border-border hover:border-primary/50",
              )}
            >
              <ImagePlaceholder className="aspect-[4/3] w-full" />
              <div className="bg-card px-2 py-1.5">
                <div className="truncate font-semibold text-foreground text-xs">{s[locale]}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetControl({
  value,
  onChange,
  disabled,
}: {
  value: BudgetTier;
  onChange: (v: BudgetTier) => void;
  disabled?: boolean;
}) {
  const { locale, dict } = useTranslation();
  return (
    <div>
      <Label>{dict.style.budget}</Label>
      <div className="flex gap-2">
        {BUDGET_OPTIONS.map((b) => {
          const on = value === b.value;
          return (
            <button
              type="button"
              key={b.value}
              disabled={disabled}
              onClick={() => onChange(b.value)}
              className={cn(
                "flex-1 rounded-xl border-[1.5px] py-2 font-semibold text-sm transition-colors disabled:opacity-60",
                on
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border text-foreground hover:border-primary/50",
              )}
            >
              {b[locale]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PromptControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const { dict } = useTranslation();
  return (
    <div>
      <Label>
        {dict.style.customPrompt}{" "}
        <span className="font-medium text-muted-foreground">{dict.common.optional}</span>
      </Label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        maxLength={500}
        placeholder={dict.style.promptPlaceholder}
        className="min-h-16 w-full resize-none rounded-xl border-[1.5px] border-border p-3 text-foreground text-sm placeholder:text-brand-faint focus:border-primary focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}
