import { DataProvider } from "./data.provider";

/*
 * QueryProvider (ported from the reference). An async Server Component that
 * awaits a page's `promises` object (built from *.queries.ts / serverRpc) and
 * hands the resolved data to DataProvider for client consumption.
 *
 * Usage in a page (inside <Suspense>):
 *   const promises = designPromises(id);
 *   <QueryProvider promises={promises}><ResultView /></QueryProvider>
 */

type PromiseType<T> = T extends Promise<infer U> ? U : T;
type PromisesObject<T> = { [K in keyof T]: Promise<T[K]> };
type ResolvedPromises<T> = { [K in keyof T]: PromiseType<T[K]> };

// biome-ignore lint/suspicious/noExplicitAny: generic factory signature
export type AwaitedPromisesType<T extends (...args: any[]) => any> = ResolvedPromises<
  ReturnType<T>
>;

interface QueryProviderProps<T> {
  children: React.ReactNode;
  promises: PromisesObject<T>;
}

export async function QueryProvider<T>({ children, promises }: QueryProviderProps<T>) {
  const entries = await Promise.all(
    Object.entries(promises).map(async ([key, promise]) => [key, await promise]),
  );
  const data = Object.fromEntries(entries) as ResolvedPromises<T>;
  return <DataProvider data={data}>{children}</DataProvider>;
}
