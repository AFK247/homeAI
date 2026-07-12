"use client";

import { notFound } from "next/navigation";
import type { DesignDetailData } from "@/app/create/_modules/promises";
import { ResultView } from "@/components/result/result-view";
import { useDataProvider } from "@/providers/data.provider";

/*
 * Client consumer: reads the server-resolved design (with its resolved furniture
 * pins) from the DataProvider and renders ResultView.
 */
export function ResultContent() {
  const { design } = useDataProvider<DesignDetailData>();
  if (!design) notFound();

  return <ResultView design={design} />;
}
