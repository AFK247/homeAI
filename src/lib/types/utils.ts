/*
 * Shared type helpers (ported from the reference).
 * PromiseResult<T> — the resolved return type of an async function. Used to type
 * query/service results without hand-writing them (golden rule: never hand-write
 * a type you can infer).
 */
// biome-ignore lint/suspicious/noExplicitAny: generic function signature
export type PromiseResult<T extends (...args: any) => any> = Awaited<ReturnType<T>>;
