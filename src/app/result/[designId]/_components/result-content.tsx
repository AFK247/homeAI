"use client";

import { notFound } from "next/navigation";
import type { DesignRow } from "@/app/create/_modules/design.service";
import { ResultView } from "@/components/result/result-view";

/*
 * Client wrapper: receives the server-resolved design (with resolved furniture pins) as a
 * prop from the page and renders ResultView. No DataProvider — the page reads via serverRpc
 * and passes data down, per the oRPC convention.
 */
export function ResultContent({ design }: { design: DesignRow }) {
  if (!design) notFound();

  return <ResultView design={design} />;
}
