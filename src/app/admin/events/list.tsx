"use client";

import { DataTable } from "@/components/data-table/data-table";
import { EVENT_TYPES } from "@/db/schemas/shared.schema";
import { useDataProvider } from "@/providers/data.provider";
import { columns } from "./columns";
import type { EventsPageData } from "./promises";

/* Events list — reads result + breakdown from the DataProvider (not props). */
export function EventsList() {
  const { result, breakdown } = useDataProvider<EventsPageData>();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {breakdown.map((b) => (
          <div
            key={b.eventType}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm"
          >
            <span className="font-bold text-foreground text-lg">{b.count}</span>
            <span className="text-brand-body text-sm">{b.eventType}</span>
          </div>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={result.data}
        total={result.total}
        page={result.page}
        pageCount={result.pageCount}
        size={result.size}
        searchPlaceholder="Search events…"
        filters={[{ paramKey: "eventType", label: "Type", options: EVENT_TYPES }]}
      />
    </div>
  );
}
