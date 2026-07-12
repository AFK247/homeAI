"use client";

import { notFound } from "next/navigation";
import type { DesignDetailData } from "@/app/create/_modules/promises";
import { ResultView } from "@/components/result/result-view";
import type { DesignWithTags } from "@/db/types";
import { useDataProvider } from "@/providers/data.provider";

/*
 * Client consumer: reads the server-resolved design from the DataProvider
 * (populated by QueryProvider on the page) and renders ResultView. Furniture
 * pins (tags) are a later feature, so tags is empty for now.
 */
export function ResultContent() {
  const { design } = useDataProvider<DesignDetailData>();
  if (!design) notFound();

  const withTags: DesignWithTags = { ...design, tags: [] };
  return <ResultView design={withTags} />;
}
