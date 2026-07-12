"use client";

import { createContext, useContext } from "react";

/*
 * DataProvider (ported from the reference). Holds server-resolved data in a
 * React context so client components can read it with useDataProvider<T>().
 * Populated by QueryProvider, which awaits a page's `promises` on the server.
 */
export const DataProviderContext = createContext<unknown>(undefined);

interface DataProviderProps<T> {
  children: React.ReactNode;
  data: T;
}

export function DataProvider<T>({ children, data }: DataProviderProps<T>) {
  return <DataProviderContext.Provider value={data}>{children}</DataProviderContext.Provider>;
}

export function useDataProvider<T>(): T {
  const context = useContext(DataProviderContext);
  if (context === undefined) {
    throw new Error("useDataProvider must be used within a DataProvider");
  }
  return context as T;
}
