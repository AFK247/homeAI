# BUILD STATUS — Home AI (হোম এআই)

> Handoff snapshot. Read this to resume work. Companion docs: `PROJECT_CONTEXT.md` (what/why),
> `IMPLEMENTATION_PLAN.md` (full architecture + conventions), `CLAUDE.md` (rules for the AI agent).
> Last updated: 2026-07-12.

---

## TL;DR — where we are

Frontend-first build. **Phases 1A, 1B, 1C are done and committed. Phase 1D (backend) is NOT started** (deliberately skipped for now).

| Phase | What | Status |
|-------|------|--------|
| 1A | Scaffold (Next.js 16 + Bun + Tailwind + shadcn + Biome + design system + modal system) | ✅ done |
| 1B | Type contracts (Drizzle schemas + Zod validations + inferred types) | ✅ done |
| 1C | All screens (real routes, rendering **typed mock data**) | ✅ done |
| 1D | Backend (oRPC routers + services + Better Auth + Fal/R2/SSLCommerz/Resend) | ⏭️ **not started** |

**Everything currently builds, typechecks (strict + extras), and passes Biome.** The UI is fully clickable end-to-end on mock data. No database, no auth, no AI, no payments are wired yet.

Git history:
```
b8918ba feat: all screens against typed mock data (Phase 1C)
0c2890c feat: type-contract layer — schemas, validations, inferred types (Phase 1B)
75aa6a0 chore: scaffold Next.js 16 + Bun + Tailwind + shadcn + Biome (Phase 1A)
```

---

## Run it

```bash
cd /Users/asifferdous/Desktop/wwww/PERSONAL/homeai
bun install         # if deps not present
bun dev             # → http://localhost:3000
```
Click-through: Landing (`/`) → "ছবি দিয়ে শুরু করুন" → `/create` → `/create/style` → `/create/generating` (auto-advances ~2.6s) → `/result/a3f9` → tap any furniture pin (modal on desktop, bottom sheet on mobile).

Other commands: `bun run build`, `bun run typecheck`, `bun run check` (Biome, read-only), `bun run check:write` (Biome fix — only run on your own new files).

---

## Decisions locked (so you don't re-litigate)

Package manager **Bun** · **oRPC routers only** (no `use server` builder) · scope rows by **`userId`** (no teams/RBAC/audit) · **anonymous-first** generation (backfill on signup) · Better Auth (Facebook+Google+email, **CLI-generated** tables) · **shadcn-first** (FieldFactory/DataTable only if CRUD grows) · **async AI job + polling** (Fal's queue, we poll) · input schemas via **`createInsertSchema` + refine** · **Fal.ai** now, model **plan-driven** · **Biome** · **Pino** logs + **PostHog**/`events` for product analytics · **Zod-validated env** · lightweight **bn/en dictionary** i18n · **no self-hosted queue** (cron endpoint for cleanup) · **no tests / no git hooks** yet. Full rationale: `IMPLEMENTATION_PLAN.md §0/§0b`.

---

## What exists (file map)

### Config / tooling (root)
- `package.json` (name `homeai`, scripts incl. `db:*`), `tsconfig.json` (strict + `noUncheckedIndexedAccess`/`noImplicitOverride`/`verbatimModuleSyntax`), `biome.json`, `components.json` (shadcn), `drizzle.config.ts` (uses `DIRECT_URL`), `.env.example` (all keys, Zod-validated).

### `src/db/` — type contracts (Phase 1B) — NO logic yet
- `helpers/base.columns.ts` — `baseColumns` (cuid2 id, timestamps, soft-delete), `relationConfig`, `numericConfig`, `skipBaseColumnsWithUserId`.
- `schemas/` — `auth` (Better Auth shape + `role`), `shared` (all pgEnums + string-union types), `design` (+ `designTags`, anonymous-first), `furniture`, `vendor`, `billing` (credits + payments), `event` (the vendor-pitch metrics).
- `validations/` — `design`, `furniture`, `vendor` (drizzle-zod `createInsertSchema` + refine; `Update = Create.partial().extend({id})`).
- `types.ts` — inferred read-model types: `Design`, `FurnitureItem`, `DesignWithTags`, `ResolvedDesignTag`, `FurnitureDetail`, `CreditState`, etc. **Screens render against these.**
- `schema.ts` — barrel for the Drizzle client namespace.

### `src/app/` — screens (Phase 1C)
`layout.tsx` (Bengali fonts + `AppProviders`), `globals.css` (design-system theme). Routes: `/` landing, `/create` upload, `/create/style`, `/create/generating`, `/result/[designId]`, `/login`, `/pricing`, `/designs`, `/admin/furniture`.

### `src/components/`
- `brand/` — `Logo`, `CreditBadge` (dot meter), `StepIndicator`, `BeforeAfter`, `ImagePlaceholder` (striped stand-in for real images).
- `furniture/` — `FurniturePin`, `FurnitureDetailPanel` (Buy New/Buy Used/similar), `use-furniture-detail` (opens modal on desktop / sheet on mobile).
- `result/result-view.tsx` — the result screen body.
- `layout/site-header.tsx`.
- `modal/` — imperative modal + sheet system (Zustand stores + shadcn-backed renderers). Mounted in `AppProviders`.
- `ui/` — shadcn primitives.

### `src/lib/`, `src/config/`, `src/hooks/`
- `lib/env.ts` (Zod env), `lib/logger.ts` (Pino), `lib/format.ts` (Bengali digits + ৳ BDT), `lib/utils.ts` (`cn`), **`lib/mock-data.ts` (all screen data — DELETE in Stage D)**.
- `config/catalog.ts` (style/room/budget options + `FREE_GENERATION_LIMIT`).
- `hooks/use-media-query.ts` (`useIsDesktop`).
- `providers/app-providers.tsx` (TanStack Query + modal/sheet renderers + Toaster).

---

## Phase 1D — how to resume the backend (the mock → real swap)

The screens already import the **real Phase 1B types**. Wiring the backend = replacing mock data with `rpc`/`serverRpc` calls behind those same types, with **zero component rework**. Concrete steps:

1. **DB client** — create `src/db/client.ts` (node-postgres `Pool` singleton, `casing: 'snake_case'`, pooled `DATABASE_URL` at runtime; `global.__db__` HMR guard). Set `DATABASE_URL`/`DIRECT_URL` in `.env`, then `bun run db:push`.
2. **Better Auth** — `src/lib/auth.ts` (server) + `src/lib/auth-client.ts` + `app/api/auth/[...all]/route.ts`; regenerate/reconcile `auth.schema.ts` via the Better Auth CLI. Providers: Facebook + Google + email.
3. **oRPC wiring** — `src/server/rpc/{procedures,router,server,client,query,permission}.ts` (see `IMPLEMENTATION_PLAN.md §5`). `publicProcedure` + `protectedProcedure` (Better Auth session → `context.userId`), `withRole('admin')`.
4. **Per-feature modules** (co-locate under the route): `_modules/*.service.ts` (`'server-only'`, Drizzle, filter `userId` + `isNull(deletedAt)`) → `_modules/*.router.ts` (oRPC, `'use cache'` reads, `invalidateCache` writes) → `_modules/promises.ts`.
5. **Cross-cutting services** — `src/server/service/ai/fal.service.ts` (submit queued job + poll, plan-driven model), `storage/r2.service.ts`, `payment/sslcommerz.service.ts` (+ `app/api/webhooks/sslcommerz`), `email/resend.service.ts`, `event.service.ts` (fire-and-forget logging), `app/api/cron/expire-designs`.
6. **Swap points** (search these, replace with rpc calls):
   - `src/lib/mock-data.ts` — delete once all consumers migrated.
   - `app/result/[designId]/page.tsx` — `mockDesign` → `serverRpc.design.getById({ id: designId })`.
   - `app/create/generating/page.tsx` — the `setTimeout` redirect → `useQuery` polling `design.status` until `done`.
   - `app/create/page.tsx` + `style/page.tsx` — static selections → RHF forms (`zodResolver`) calling `design.generate`.
   - `app/designs/page.tsx` — `mockSavedDesigns` → `design.getPaginated({ isSaved })`.
   - `app/admin/furniture/page.tsx` — `mockFurniture` → `furniture.getPaginated` + create/edit sheets.
   - `components/result/result-view.tsx` + `furniture/use-furniture-detail` — `mockFurnitureDetail` → real per-tag `furniture.getById`; log `tag_click`/`buy_click` events.
   - `components/brand/credit-badge` — `mockCreditState` → real credit query; enforce `FREE_GENERATION_LIMIT` in `design.generate`.

---

## Known stubs / TODO deferred to Stage D

- **Language toggle** (bn/EN in header) is visual-only — no i18n wiring yet.
- **Upload** is a static dropzone — no file handling, no `browser-image-compression`, no R2 presign.
- **Generating** simulates completion with a timer — not real polling.
- **Buttons** (save/share/regenerate, Buy New/Used) are presentational — no handlers.
- **Auth screen** doesn't authenticate; **pricing** doesn't initiate payment; **admin** is read-only.
- **`auth.schema.ts`** is the expected Better Auth shape but must be reconciled via the Better Auth CLI before real use.
- **Phase 0 (AI quality validation on real BD rooms)** from `PROJECT_CONTEXT.md §11` was never run — still the recommended gate before investing in the AI pipeline.
