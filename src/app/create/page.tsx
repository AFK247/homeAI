import { SiteHeader } from "@/components/layout/site-header";
import { getDictionary } from "@/lib/i18n/server";
import { CreateForm } from "./_components/create-form";

/*
 * Create — a single-page form: upload + room + style + budget + optional prompt,
 * all on one screen, then Generate (guarded on the image). No multi-step wizard,
 * so the user can tweak any field freely without navigating back and forth.
 */
export default async function CreatePage() {
  const { dict } = await getDictionary();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="font-serif font-extrabold text-3xl text-foreground">{dict.upload.title}</h1>
        <p className="mt-1.5 text-brand-body">{dict.upload.subtitle}</p>

        <div className="mt-7">
          <CreateForm />
        </div>
      </main>
    </>
  );
}
