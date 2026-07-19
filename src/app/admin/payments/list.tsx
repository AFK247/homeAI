import { DataTable } from "@/components/data-table/data-table";
import { parseListParams, type RawSearchParams } from "@/db/helpers/search-params";
import { PAYMENT_STATUSES } from "@/db/schemas/shared.schema";
import { serverRpc } from "@/server/rpc/server";
import { columns } from "./columns";

/* Payments list — server component. Revenue summary strip + the paginated transaction table. */
export async function PaymentsList({ searchParams }: { searchParams: RawSearchParams }) {
  const params = parseListParams(searchParams, { filterKeys: ["status"] });
  const [result, summary] = await Promise.all([
    serverRpc.adminBilling.payments(params),
    serverRpc.adminBilling.revenueSummary(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Revenue"
          value={`৳${Math.round(summary.revenueBdt).toLocaleString("en-US")}`}
        />
        <SummaryCard label="Paying users" value={summary.payingUsers.toLocaleString("en-US")} />
        <SummaryCard label="Credits sold" value={summary.creditsSold.toLocaleString("en-US")} />
      </div>

      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        size={result.size}
        keyField="id"
        filters={[{ paramKey: "status", label: "Status", options: PAYMENT_STATUSES }]}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <div className="text-brand-body text-sm">{label}</div>
      <div className="mt-1 font-serif font-extrabold text-2xl text-foreground">{value}</div>
    </div>
  );
}
