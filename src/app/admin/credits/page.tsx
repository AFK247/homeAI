import { Coins } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { LedgerList } from "./list";

/*
 * Admin — credit ledger. The append-only credit_transactions feed: every grant, debit, purchase,
 * refund, and expiry, filterable by kind (free/paid) and reason. Backend-paginated. Read-only.
 */
export default async function AdminCreditsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Credit ledger"
        description="Every credit movement — grants, generations (debits), purchases, refunds, expiries."
        icon={<Coins className="size-5" />}
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <LedgerList searchParams={params} />
      </Suspense>
    </>
  );
}
