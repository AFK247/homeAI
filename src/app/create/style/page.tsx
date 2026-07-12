import { StepIndicator } from "@/components/brand/step-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { getDictionary } from "@/lib/i18n/server";
import { StylePicker } from "../_components/style-picker";

/*
 * Step 2 — Style selection. Server Component shell; StylePicker is the client
 * island holding the selections and advancing to /create/generating.
 */
export default async function StylePage() {
  const { dict } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <StepIndicator current={2} />
        <h1 className="mt-5 font-serif font-extrabold text-3xl text-foreground">
          {dict.style.title}
        </h1>
        <p className="mt-1.5 text-brand-body">{dict.style.subtitle}</p>
        <StylePicker />
      </main>
    </>
  );
}
