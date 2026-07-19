import { CreditCard } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { PaymentsList } from "./list";

/*
 * Admin — payments / revenue. Every SSLCommerz transaction with the buyer, amount, credits, and
 * status, plus revenue totals up top. Backend-paginated via serverRpc. Read-only.
 */
export default async function AdminPaymentsPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Payments"
        description="SSLCommerz transactions (bKash / Nagad / card) and revenue."
        icon={<CreditCard className="size-5" />}
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <PaymentsList searchParams={params} />
      </Suspense>
    </>
  );
}
