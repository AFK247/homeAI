@AGENTS.md

# Home AI (হোম এআই) — project guide for Claude Code

AI interior-design platform for Bangladesh. The AI redesign is the **acquisition hook**; the **local furniture marketplace is the product**. Full product spec: `PROJECT_CONTEXT.md`. Full architecture + conventions + build order: `IMPLEMENTATION_PLAN.md`. **Read both before writing code.**

## Stack (decided — see IMPLEMENTATION_PLAN.md §0/§0b)
- Next.js 16 App Router + React 19 + TypeScript (strict + `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`)
- **Bun** (package manager + runtime), **Biome** (format + lint), **Pino** (system logs)
- Drizzle ORM + Supabase Postgres (pooled at runtime, direct for migrations)
- **oRPC routers only** for server (no `use server` action builder) — see plan §5
- Better Auth (Facebook + Google + email), **anonymous-first** generation
- shadcn/ui + Tailwind 4, imperative modal/sheet system (Zustand)
- R2 (images), Fal.ai (AI, plan-driven), SSLCommerz (bKash/Nagad), Resend (email)

## Golden rules (from the reference codebase conventions)
- **NEVER hand-write a type you can infer.** Row types from `$inferSelect`; input types from `z.infer` of a `createInsertSchema`-seeded schema; list types from `Awaited<ReturnType<typeof Service.method>>`.
- **Layering:** oRPC router (validation + auth + cache) → service (`'server-only'`, all Drizzle) → db. Router never touches Drizzle; service never touches auth/cache/cookies.
- **Scope every row by `userId`** (or `anonymousId` pre-signup). Soft-delete via `deletedAt`. No `teamId`, no RBAC/audit/approvals.
- One Zod schema per entity validates BOTH server (`.input()`) and client (`zodResolver`). Lives in `src/db/validations/`.
- Use `@/...` alias imports, not relative. Bangla-first UI.
- **Never run `bun run check:write` on the whole tree unprompted** beyond fixing your own new files — it reformats everything.

## oRPC module convention (MANDATORY — mirror the admin modules exactly)
Every feature's server code lives in a colocated `_modules/` dir holding **exactly two files**: `<entity>.router.ts` and `<entity>.service.ts`. Nothing else.
- **DO NOT** create `*.queries.ts`, `promises.ts`, `QueryProvider`, or `DataProvider` — that old reference/hydration pattern is fully removed. Adding it back is a convention violation.
- **Router** (`<entity>.router.ts`): `publicProcedure`/`protectedProcedure`/`adminProcedure`, `.input(zodSchema)`, `.handler` calls the service. Validation + auth + scoping only. Mounted in `src/server/rpc/router.ts` under its key.
- **Service** (`<entity>.service.ts`): `import "server-only"`, all Drizzle, returns `null` on miss. No auth/cookies. Export inferred row/list types (`Awaited<ReturnType<typeof Service.method>>`).
- **Server Components read via `serverRpc`** (in-process client, `src/server/rpc/server.ts`): `const x = await serverRpc.<entity>.<method>(input)`, then pass the resolved data to client components **as props**. No client-side data provider.
- **Client mutations** call `rpc.<entity>.<method>(...)` (`src/server/rpc/client.ts`).
- Reference implementations to copy: `src/app/admin/categories/_modules/`, `src/app/admin/vendors/_modules/`, and the pages under `src/app/admin/*` (`list.tsx` → `serverRpc.*.getPaginated`).

## Build order (frontend-first — see plan §11)
Stage A scaffold ✅ → Stage B typed contracts (schemas + validations + inferred types, NO logic) → Stage C all screens (real routes, typed mock data) → Stage D backend (oRPC + services + auth, swap mock → real). **Do not build the backend before the screens.**

## Commands
```bash
bun dev              # dev server (turbopack)
bun run build        # production build
bun run typecheck    # tsc --noEmit
bun run check        # Biome (read-only)
bun run db:push      # push Drizzle schema (local dev)
```

## Design system
Extracted into `src/app/globals.css` from `design/Home AI Screens.dc.html` (plan §7b). Green `#1C4E3F` primary, gold `brand-gold` reserved for used/second-hand pricing, Noto Serif Bengali (headings) + Hind Siliguri (body). Modal/sheet system in `src/components/modal/` (plan §7c).
