"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { ModalRenderer, SheetRenderer } from "@/components/modal";
import { Toaster } from "@/components/ui/sonner";
import { warmDeviceFingerprint } from "@/lib/fingerprint";

/*
 * Client-side app providers, mounted once in the root layout.
 * - TanStack Query (client data fetching / status polling for the AI job)
 * - Modal + Sheet renderers (imperative pop-up system, §7c)
 * - Toaster (sonner)
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  // Warm the device fingerprint early (abuse defense) so it's ready as the `x-device-fingerprint`
  // header before the first guarded rpc call. Fire-and-forget; never blocks render.
  useEffect(() => {
    warmDeviceFingerprint();
  }, []);

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
