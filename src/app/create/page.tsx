import { StepIndicator } from "@/components/brand/step-indicator";
import { SiteHeader } from "@/components/layout/site-header";
import { RoomPicker } from "./_components/room-picker";
import { UploadPanel } from "./_components/upload-panel";

/*
 * Step 1 — Upload. Server Component: static shell (header, headings, layout)
 * renders on the server; the interactive bits are client islands (UploadPanel,
 * RoomPicker) so only they ship JS.
 */
export default function UploadPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <StepIndicator current={1} />
        <h1 className="mt-5 font-serif font-extrabold text-3xl text-foreground">
          আপনার ঘরের একটি ছবি দিন
        </h1>
        <p className="mt-1.5 text-brand-body">স্পষ্ট আলোতে তোলা ছবি হলে সবচেয়ে ভালো ফল পাবেন।</p>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
          <UploadPanel />
          <RoomPicker />
        </div>
      </main>
    </>
  );
}
