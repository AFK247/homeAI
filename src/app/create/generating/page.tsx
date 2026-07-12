import { SiteHeader } from "@/components/layout/site-header";
import { GenerationRunner } from "../_components/generation-runner";

/*
 * Step 3 — Generating. Server Component shell; GenerationRunner is the client
 * island that fires the generation and redirects to the result.
 */
export default function GeneratingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center gap-7 bg-gradient-to-b from-background to-secondary/40 px-6 py-20 text-center">
        <GenerationRunner />
      </main>
    </>
  );
}
