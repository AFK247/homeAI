# Module Convention (oRPC)

How a feature module is structured in this codebase. Derived from the team reference
project (`proa-erp`) — verified across the `country`, `contract`, `training`, `payment`
and `organizations` oRPC modules — and adapted to what this repo has today (no auth,
no cache infra yet).

**One rule above all:** a feature lives in a `_modules/` folder *next to the page that
uses it*, and the layers never leak into each other.

---

## The layers

```
router  →  service  →  db
(validate,   (all       (Drizzle
 auth,        Drizzle,    tables)
 cache)       no auth)
```

| Layer | File | May touch | May NOT touch |
|-------|------|-----------|---------------|
| **Router** | `x.router.ts` | validation, auth, cache, calls service | Drizzle / the DB |
| **Service** | `x.service.ts` | Drizzle, the DB | auth, cache, cookies, request context |

Two files is the whole oRPC module. `queries.ts` / `actions.ts` belong to *other*
module types (procedure-query, server-actions) — **not** the oRPC pattern.

---

## File layout

```
app/<feature>/_modules/
├── <entity>.router.ts     ← oRPC procedures (the API surface)
└── <entity>.service.ts    ← all Drizzle (reads + writes)
```

- Filename = **entity singular** (`design.service.ts`, `country.service.ts`) — matches
  the reference's dominant rule and our own `create/_modules/design.service.ts`.
- Folder = route (usually plural).

Then register the router once in `src/server/rpc/router.ts`:

```ts
import { designRouter } from "@/app/create/_modules/design.router";
export const router = { design: designRouter, /* … */ };
```

---

## Router — the exact shape

Every procedure is the same 4-step chain. Declare the HTTP method explicitly.

```ts
import "server-only";
import { z } from "zod";
import { publicProcedure } from "@/server/rpc/procedures";
import { CountryService } from "./country.service";
// (reference also imports withPermission + shared zod schemas — see "Not yet" below)

export const countryRouter = {
  // ── QUERIES (reads) — method: "GET" ──────────────────────────────
  getPaginated: publicProcedure
    .route({ method: "GET" })
    .input(searchParamsInputSchema)
    .handler(({ input }) => CountryService.getPaginated(input)),

  getById: publicProcedure
    .route({ method: "GET" })
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CountryService.getById(input.id)),

  // ── MUTATIONS (writes) — method: "POST" (ALWAYS, even delete) ─────
  create: publicProcedure
    .route({ method: "POST" })
    .input(CreateCountrySchema)
    .handler(({ input, context }) => CountryService.create(input, context)),

  update: publicProcedure
    .route({ method: "POST" })
    .input(UpdateCountrySchema)
    .handler(({ input, context }) => CountryService.update(input, context)),

  delete: publicProcedure
    .route({ method: "POST" })          // ← NOT "DELETE". The reference uses only GET/POST.
    .input(z.object({ id: z.string().min(1) }))
    .handler(({ input }) => CountryService.remove(input.id)),
};

// Inferred types at the bottom — NEVER hand-write these.
export type PaginatedCountry = Awaited<
  ReturnType<typeof CountryService.getPaginated>
>["data"][number];
```

**The verb rule (verified across 5 modules):** the reference uses **only `GET` and
`POST`**. Reads are `GET`; every mutation — create, update, *and delete* — is `POST`.
There is no `PATCH` or HTTP `DELETE`.

**Style:** procedures may be inline (as above, like `country`) or named consts then
assembled (like `contract`: `export const listContractsProcedure = …` then
`{ list: listContractsProcedure }`). Both are in the reference; inline is simpler.

---

## Service — the exact shape

All Drizzle, nothing else. Reads and writes for one entity.

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import type { SearchParams } from "@/db/helpers/search-params";
import { andWhere, equalFilters, paginate, searchFilters, sqlCount, withSorting }
  from "@/db/helpers/with-filters";
import { countries } from "@/db/schemas/location.schema";
import type { CreateCountryInput, UpdateCountryInput }
  from "@/db/validations/location.validation";

export const CountryService = {
  // reads
  getPaginated: async (params: SearchParams) => {
    const where = andWhere([
      searchFilters([countries.name, countries.iso3], params.search),
      ...equalFilters({ region: countries.region }, params.filters),
    ]);
    return paginate(params, db.select(sqlCount()).from(countries).where(where),
      (limit, offset) => db.select().from(countries).where(where)
        .orderBy(withSorting({ name: countries.name }, params, countries.name))
        .limit(limit).offset(offset));
  },

  getById: async (id: string) =>
    db.query.countries.findFirst({ where: (t, { eq: e }) => e(t.id, id) }),

  // writes — return the affected row via .returning()
  create: async (input: CreateCountryInput, ctx: { userId?: string }) => {
    const [row] = await db.insert(countries)
      .values({ ...input, createdBy: ctx.userId }).returning();
    return row;
  },

  update: async ({ id, ...input }: UpdateCountryInput, ctx: { userId?: string }) => {
    const [row] = await db.update(countries)
      .set({ ...input, updatedAt: new Date(), updatedBy: ctx.userId })
      .where(eq(countries.id, id)).returning();
    return row;
  },

  remove: async (id: string) => {
    const [row] = await db.delete(countries).where(eq(countries.id, id)).returning();
    return row;
  },
};
```

Rules: mutations `.returning()` the affected row; **types are inferred** from
`createInsertSchema` / `$inferSelect`, never hand-written.

---

## How each side is consumed

- **Client mutation** — call the procedure directly in a transition:
  ```ts
  startTransition(async () => { await rpc.design.regenerate({ id }); router.refresh(); });
  ```
  (Not `useMutation` — this repo calls `rpc.*` in `startTransition`.)

- **Server read** — either call the procedure, or (this repo's admin/create pattern)
  compose reads in a route-level `promises.ts` awaited by `QueryProvider`.

---

## Read-only routes are a DIFFERENT (valid) pattern

Not every route is an oRPC module. **Admin list pages have no mutations**, so they have
**no router** — they read on the server through `promises.ts` + `QueryProvider`:

```
admin/<entity>/
├── _modules/<entity>.service.ts    ← Drizzle reads (or reuse a central service)
├── _modules/<entity>.queries.ts    ← thin read wrappers (the 'use cache' seam)
├── promises.ts                     ← composes the reads for the page
└── columns.tsx, list.tsx, page.tsx ← flat view components
```

The reference does this too (its parent-level `analytics.service.ts` has no router).
Do **not** add a `router.ts` to a route that never mutates — that's ceremony.

**Cross-entity reads** (dashboard totals spanning many tables) live in a shared parent
module (`admin/_modules/admin.service.ts`), not in any one entity.

---

## Not yet in this repo (add when the infra lands — do NOT scaffold early)

The reference has two layers this repo hasn't built. Our routers are otherwise
identical; these slot into the *same files* later without restructuring:

| Reference has | This repo | When it arrives |
|---|---|---|
| `withPermission(PERMISSIONS.…)` on every procedure | `publicProcedure`, no auth | Add `.use(withPermission(...))` when Better Auth is wired |
| `'use cache'` + `cacheConfig(cacheKey.…)` on reads | uncached | Wrap reads when the cacheKey/cacheConfig helpers land (plan §6) |
| `AuditTrailService.create(...)` after mutations | none | If/when an audit trail is needed |

Adding these is editing existing procedures, never a new folder shape.

---

## Checklist for a new oRPC module

1. `app/<feature>/_modules/<entity>.service.ts` — Drizzle only, reads + writes, `.returning()` on writes.
2. `app/<feature>/_modules/<entity>.router.ts` — `.route({ method })` + `.input(zod)` + `.handler(→ service)`; `GET` reads, `POST` mutations.
3. Inferred types at the bottom of the router (`Awaited<ReturnType<…>>`).
4. Register in `src/server/rpc/router.ts`.
5. One Zod schema per entity in `src/db/validations/` validates BOTH `.input()` and the client form.
6. No router for read-only routes — use `promises.ts` instead.
