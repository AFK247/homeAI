"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { Button } from "@/components/ui/button";
import { BUDGET_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import { useTranslation } from "@/lib/i18n/client";
import { useCreateStore } from "../_modules/create-store";

/*
 * Client island: style grid + budget + optional prompt + generate button.
 * Guards against a direct visit with no uploaded image (→ back to step 1).
 * The page shell around it stays a Server Component.
 */
export function StylePicker() {
  const { dict, locale } = useTranslation();
  const router = useRouter();
  const image = useCreateStore((s) => s.image);
  const style = useCreateStore((s) => s.style);
  const budget = useCreateStore((s) => s.budget);
  const prompt = useCreateStore((s) => s.prompt);
  const setStyle = useCreateStore((s) => s.setStyle);
  const setBudget = useCreateStore((s) => s.setBudget);
  const setPrompt = useCreateStore((s) => s.setPrompt);

  useEffect(() => {
    if (!image) router.replace("/create");
  }, [image, router]);

  return (
    <div className="mt-6 grid items-start gap-7 lg:grid-cols-[2fr_1fr]">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {STYLE_OPTIONS.map((s) => (
          <button
            type="button"
            key={s.value}
            onClick={() => setStyle(s.value)}
            className={
              style === s.value
                ? "overflow-hidden rounded-2xl border-[2.5px] border-primary text-left shadow-sm"
                : "overflow-hidden rounded-2xl border-[1.5px] border-border text-left"
            }
          >
            <ImagePlaceholder className="h-28" />
            <div className="bg-card p-3">
              <div className="font-bold text-foreground text-sm">{s.bn}</div>
              <div className="text-muted-foreground text-xs">{s.en}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm">
        <div>
          <h2 className="mb-3 font-bold text-foreground">{dict.style.budget}</h2>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                type="button"
                key={b.value}
                onClick={() => setBudget(b.value)}
                className={
                  budget === b.value
                    ? "flex-1 rounded-xl border-[1.5px] border-primary bg-secondary py-2.5 font-semibold text-secondary-foreground text-sm"
                    : "flex-1 rounded-xl border-[1.5px] border-border py-2.5 font-semibold text-foreground text-sm"
                }
              >
                {b[locale]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-bold text-foreground">
            {dict.style.customPrompt}{" "}
            <span className="font-medium text-muted-foreground">{dict.common.optional}</span>
          </h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            placeholder={dict.style.promptPlaceholder}
            className="min-h-24 w-full resize-none rounded-xl border-[1.5px] border-border p-3.5 text-foreground text-sm placeholder:text-brand-faint focus:border-primary focus:outline-none"
          />
        </div>
        <Button size="lg" onClick={() => router.push("/create/generating")}>
          {dict.style.generate}
        </Button>
      </div>
    </div>
  );
}
