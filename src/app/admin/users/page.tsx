import { UserCog } from "lucide-react";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import type { PageSearchParams } from "@/db/helpers/search-params";
import { UsersUsageList } from "./list";

/*
 * Admin — users & credit usage. One row per credit owner (signed-up users AND currently-anonymous
 * sessions), type-badged (Anonymous / Free / Paid), with balance, purchased, consumed, and spend.
 * Backend-paginated via serverRpc. Read-only.
 */
export default async function AdminUsersPage({ searchParams }: PageSearchParams) {
  const params = await searchParams;
  return (
    <>
      <PageHeader
        title="Users & usage"
        description="Everyone consuming credits — anonymous sessions, free sign-ups, and paying users — with balance, spend, and consumption."
        icon={<UserCog className="size-5" />}
      />
      <Suspense fallback={<DataTableSkeleton />}>
        <UsersUsageList searchParams={params} />
      </Suspense>
    </>
  );
}
