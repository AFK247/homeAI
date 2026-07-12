"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { SessionsPageData } from "./promises";

/* Sessions list — reads its data from the DataProvider (not props). */
export function SessionsList() {
  const { sessions } = useDataProvider<SessionsPageData>();
  return (
    <DataTable columns={columns} data={sessions} rowKey={(s, i) => s.anonymousId ?? String(i)} />
  );
}
