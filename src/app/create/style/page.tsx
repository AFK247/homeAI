import Link from "next/link";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { StepIndicator } from "@/components/brand/step-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { BUDGET_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";

/*
 * Step 2 — Style selection. Visual style grid + budget hint + optional free-text prompt.
 * Budget maps to the plan-driven AI model tier (plan §7b). First style/medium preselected.
 */
export default function StylePage() {
  return (
    <>
      <SiteHeader showNav={false} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <StepIndicator current={2} />
        <h1 className="mt-5 font-serif font-extrabold text-3xl text-foreground">স্টাইল বাছুন</h1>
        <p className="mt-1.5 text-brand-body">
          পছন্দের ডিজাইন বেছে নিন — পরে যেকোনো সময় বদলাতে পারবেন।
        </p>

        <div className="mt-6 grid items-start gap-7 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {STYLE_OPTIONS.map((style, i) => (
              <button
                type="button"
                key={style.value}
                className={
                  i === 0
                    ? "overflow-hidden rounded-2xl border-[2.5px] border-primary text-left shadow-sm"
                    : "overflow-hidden rounded-2xl border-[1.5px] border-border text-left"
                }
              >
                <ImagePlaceholder className="h-28" />
                <div className="bg-card p-3">
                  <div className="font-bold text-foreground text-sm">{style.bn}</div>
                  <div className="text-muted-foreground text-xs">{style.en}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm">
            <div>
              <h2 className="mb-3 font-bold text-foreground">বাজেট</h2>
              <div className="flex gap-2">
                {BUDGET_OPTIONS.map((b, i) => (
                  <button
                    type="button"
                    key={b.value}
                    className={
                      i === 1
                        ? "flex-1 rounded-xl border-[1.5px] border-primary bg-secondary py-2.5 font-semibold text-secondary-foreground text-sm"
                        : "flex-1 rounded-xl border-[1.5px] border-border py-2.5 font-semibold text-foreground text-sm"
                    }
                  >
                    {b.bn}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 font-bold text-foreground">
                নিজের মতো বলুন <span className="font-medium text-muted-foreground">(ঐচ্ছিক)</span>
              </h2>
              <div className="min-h-24 rounded-xl border-[1.5px] border-border p-3.5 text-brand-faint text-sm">
                যেমন: হালকা রঙ, কাঠের আসবাব, বেশি আলো...
              </div>
            </div>
            <Button size="lg" asChild>
              <Link href="/create/generating">ঘর সাজান ✦</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
