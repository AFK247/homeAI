import { StepIndicator } from "@/components/brand/step-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { StylePicker } from "../_components/style-picker";

/*
 * Step 2 — Style selection. Server Component shell; StylePicker is the client
 * island holding the selections and advancing to /create/generating.
 */
export default function StylePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <StepIndicator current={2} />
        <h1 className="mt-5 font-serif font-extrabold text-3xl text-foreground">স্টাইল বাছুন</h1>
        <p className="mt-1.5 text-brand-body">
          পছন্দের ডিজাইন বেছে নিন — পরে যেকোনো সময় বদলাতে পারবেন।
        </p>
        <StylePicker />
      </main>
    </>
  );
}
