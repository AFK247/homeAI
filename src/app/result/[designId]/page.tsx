import { CreditBadge } from "@/components/brand/credit-badge";
import { Logo } from "@/components/brand/logo";
import { ResultView } from "@/components/result/result-view";
import { mockCreditState, mockDesign } from "@/lib/mock-data";

/*
 * Step 4 — Result. Redesigned image + clickable furniture pins + actions.
 * Stage C renders mock data; Stage D fetches the design by id via serverRpc.
 */
export default async function ResultPage({ params }: { params: Promise<{ designId: string }> }) {
  await params; // designId used in Stage D to fetch the real design
  const design = mockDesign;

  return (
    <>
      <header className="flex items-center justify-between border-border border-b bg-card px-5 py-4 md:px-10">
        <Logo size="md" />
        <CreditBadge credit={mockCreditState} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 md:px-10">
        <ResultView design={design} />
      </main>
    </>
  );
}
