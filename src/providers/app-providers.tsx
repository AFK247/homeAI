"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { ModalRenderer, SheetRenderer } from "@/components/modal";
import { Toaster } from "@/components/ui/sonner";

/*
 * Client-side app providers, mounted once in the root layout.
 * - TanStack Query (client data fetching / status polling for the AI job)
 * - Modal + Sheet renderers (imperative pop-up system, §7c)
 * - Toaster (sonner)
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Suspense: TopProgressBar reads useSearchParams. */}
      <Suspense fallback={null}>
        <TopProgressBar />
      </Suspense>
      {children}
      <ModalRenderer />
      <SheetRenderer />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
