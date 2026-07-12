# IMPLEMENTATION PLAN — AI Interior Design Platform for Bangladesh

> Companion to `PROJECT_CONTEXT.md`. That file is **what** we build and **why**; this file is **how** we build it and **in what order**.
> Conventions here are extracted from the reference codebase (`proa-erp`, a Next.js 16 monorepo) and **adapted** to this project's decisions.

---

## 0. Decisions Locked (from the clarifying round)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Repo structure | **Single Next.js app**, folder-mirrored (`src/server`, `src/db`, `src/components`) — recreate the reference's conventions as folders, not `@workspace/*` packages. |
| 2 | Server pattern | **oRPC routers only** (`*.router.ts`, the tax-code pattern). Drop the reference's second custom `'use server'` builder. |
| 3 | Tenancy | **Drop `teamId`.** Scope every row by `userId`. Keep `baseColumns` (cuid2 id, timestamps, soft delete). Drop RBAC / approvals / audit-trails. |
| 4 | Stack conflicts | **PROJECT_CONTEXT wins on infra** (R2, Fal/Replicate, SSLCommerz, Supabase Postgres, Better Auth); **reference wins on code patterns** (Drizzle layout, module structure, type inference, oRPC). |
| 5 | UI reuse | **Plain shadcn/ui + react-hook-form first.** Port FieldFactory/DataTable later only if CRUD grows. |
| 6 | AI job flow | **Async job + polling.** Mutation kicks off a Fal queued job → returns `jobId` → client polls a status query. |
| 7 | Input schemas | **`createInsertSchema(table)` + refine.** `Update = Create.partial().extend({ id })`. |
| 8 | Auth gate | **Anonymous-first.** Generate 3–5× with no login (anon session cookie), then force sign-in. `generate` is a `publicProcedure` with an anon-session fallback; `designs`/`events` carry `anonymousId`. |
| 9 | Auth tables | **Better Auth CLI generate** the Drizzle schema; treat as owned-by-auth (only add our `role` column). |
| 10 | AI provider | **Fal.ai now.** But provider + model + resolution are **plan-dependent** and resolved at call time — not hardcoded. |

---

## 0b. Toolchain & Foundational Decisions

| Concern | Choice | Notes |
|---------|--------|-------|
| **Package manager** | **Bun** | Runtime + package manager + test runner. All scripts assume `bun`. |
| **TypeScript** | **Strict + extras** | `strict: true` + `noUncheckedIndexedAccess`, `noImplicitOverride`, `verbatimModuleSyntax`. |
| **Lint / format** | **Biome** | Single fast tool (matches reference). One `biome.json`. |
| **Logger** | **Pino** | Structured JSON logs (matches reference). `src/lib/logger.ts` wrapper. |
| **Product analytics** | **PostHog + Postgres `events` table** | System logs (Pino) vs product events (PostHog + `events`) kept separate. |
| **Env validation** | **Zod-validated env module** | `src/lib/env.ts` parses `process.env` through a Zod schema at boot; fails fast on missing keys. Split server/client vars. |
| **i18n** | **Lightweight bn/en dictionary** | JSON dictionaries + `useTranslation` hook / server helper. Bangla default, English toggle. No locale routing. |
| **Queue / background jobs** | **NO self-hosted queue for MVP** | Fal's own queue handles generation (we submit + poll). Emails = fire-and-forget. Expiry cleanup = a cron/scheduled endpoint. **No Redis, no worker daemon.** Revisit if real background load appears. |
| **Testing** | **None during early MVP** | Add Vitest once the core flow is proven; Playwright E2E later. Not scaffolded now. |
| **Git hooks** | **None for now** | No Husky/commitlint yet. Rely on CI/discipline; add later. |

> **Removed from the plan vs. the reference:** the reference runs a separate `apps/forge` BullMQ+Redis worker service. We do **not** replicate it. Any periodic work (expire unsaved designs after 7–30 days per PROJECT_CONTEXT §9.2) runs as a scheduled endpoint (`app/api/cron/expire-designs/route.ts`), triggered by the host's cron. This keeps us single-process and host-portable.

## 1. Architecture Overview

A single Next.js 16 (App Router, React 19, TS) app. One consistent server pattern: **oRPC**. Data flows:

```
Client component ──(HTTP)──▶ /api/rpc ──▶ oRPC router ──▶ service ──▶ Drizzle ──▶ Postgres
Server component ──(in-process, no HTTP)─▶ serverRpc ──▶ oRPC router ──▶ service ──▶ Drizzle
```

Three strict layers, mirroring the reference:

- **Router** (`*.router.ts`) — the API boundary. Owns: input validation (`.input(zodSchema)`), auth (Better Auth session → `context.userId`), caching (reads) and cache invalidation (writes). **Never** touches Drizzle directly.
- **Service** (`*.service.ts`) — `import 'server-only'`. Pure business logic + all Drizzle queries. Always filters `userId` and `isNull(deletedAt)`. Returns `null` (not `undefined`). No caching, no auth, no `cookies()`/`headers()`.
- **db** (`src/db/client.ts`) — the Drizzle client. Touched only by services.

Golden rule carried over: **never hand-write a type you can infer.** Row types from `$inferSelect`; input types from `z.infer` of a `createInsertSchema`-seeded schema; list types from `Awaited<ReturnType<typeof Service.method>>`.

---

## 2. Folder Structure

```
new-new/                              # (rename dir later; App Router root)
├── PROJECT_CONTEXT.md
├── IMPLEMENTATION_PLAN.md            # this file
├── drizzle.config.ts
├── next.config.ts                    # cacheLife profiles, image domains (R2), etc.
├── components.json                   # shadcn config
├── .env / .env.example
└── src/
    ├── app/
    │   ├── (marketing)/              # landing, before/after, how-it-works
    │   │   └── page.tsx
    │   ├── (app)/                    # authed product flow
    │   │   ├── layout.tsx
    │   │   ├── create/               # upload → style → generate entry
    │   │   ├── result/[designId]/    # redesigned image + furniture pins
    │   │   ├── designs/              # saved designs gallery
    │   │   └── pricing/
    │   ├── (auth)/                   # login / signup (Facebook, Google, email)
    │   ├── admin/                    # light-role: furniture catalog + vendor CRUD
    │   ├── api/
    │   │   ├── rpc/[[...rest]]/route.ts   # oRPC handler
    │   │   ├── auth/[...all]/route.ts     # Better Auth handler
    │   │   ├── webhooks/sslcommerz/route.ts
    │   │   ├── cron/expire-designs/route.ts  # scheduled cleanup (no queue; host cron hits this)
    │   │   └── uploads/                    # R2 presigned-url issuance (if not via rpc)
    │   └── globals.css
    ├── db/
    │   ├── client.ts                 # Drizzle + node-postgres pool singleton
    │   ├── schema.ts                 # barrel (namespace export for drizzle)
    │   ├── schemas/                  # [module].schema.ts
    │   │   ├── auth.schema.ts         # Better Auth tables (users, sessions, accounts, verification)
    │   │   ├── design.schema.ts       # designs, design_tags
    │   │   ├── furniture.schema.ts    # furniture_items
    │   │   ├── vendor.schema.ts       # vendors
    │   │   ├── billing.schema.ts      # credits, subscriptions, payments
    │   │   ├── event.schema.ts        # events (THE vendor sales pitch)
    │   │   └── shared.schema.ts       # pgEnums (style, roomType, condition, source, eventType…)
    │   ├── validations/              # [module].validation.ts (drizzle-zod)
    │   └── helpers/
    │       ├── base.columns.ts        # baseColumns, relationConfig, numericConfig, skip*
    │       └── with-pagination.ts     # paginate(), etc. (ported as needed)
    ├── server/
    │   ├── rpc/
    │   │   ├── router.ts              # webRouter = merge of all module routers
    │   │   ├── server.ts              # serverRpc (createRouterClient, 'server-only')
    │   │   ├── client.ts              # rpc (HTTP client for 'use client')
    │   │   ├── query.ts               # orpc = createTanstackQueryUtils(rpc)
    │   │   ├── procedures.ts          # publicProcedure, protectedProcedure (auth middleware)
    │   │   └── permission.ts          # (light) withRole('admin') if needed
    │   └── service/                   # cross-cutting services
    │       ├── ai/fal.service.ts      # Fal.ai client: submit job, poll status
    │       ├── storage/r2.service.ts  # R2 presign, put, cached GET headers
    │       ├── payment/sslcommerz.service.ts
    │       └── email/resend.service.ts
    ├── modules/                       # feature modules (co-located, non-route)
    │   └── <feature>/_modules/        # router + service + promises + validation live WITH the route when route-bound
    ├── components/
    │   ├── ui/                        # shadcn primitives (button, input, dialog, sheet…)
    │   ├── forms/                     # RHF field wrappers (Input, Select, ImageDrop)
    │   └── <feature>/                 # feature components (UploadZone, StyleGrid, FurniturePin…)
    ├── providers/
    │   ├── query.provider.tsx         # server: awaits promises → DataProvider
    │   ├── data.provider.tsx          # React context + useDataProvider<T>()
    │   └── tanstack.provider.tsx      # client: QueryClientProvider
    ├── lib/
    │   ├── auth.ts                    # Better Auth server instance
    │   ├── auth-client.ts             # Better Auth React client
    │   ├── env.ts                     # Zod-validated process.env (fail-fast at boot)
    │   ├── logger.ts                  # Pino wrapper
    │   ├── types/                     # PromiseResult<T>, shared helpers
    │   ├── utils/
    │   │   ├── cache.ts               # cacheConfig(profile, ...tags)
    │   │   ├── invalidate-cache.ts    # invalidateCache(tag, mode)
    │   │   └── handle-response.ts
    │   └── i18n/                      # bn/en dictionaries (Bangla-first)
    └── config/
        ├── cache-tags.ts              # cacheKey.* centralized
        ├── pages.ts                   # PAGES route constants
        ├── styles.ts                  # design styles catalog (Bangladeshi-tuned)
        └── credits.ts                 # free cap, pack sizes
```

**Note on module co-location:** the reference co-locates `_modules/` (router, service, promises) *inside the route folder* (e.g. `tax-codes/_modules/`). We keep that: route-bound logic lives under `app/(app)/<feature>/_modules/`. Cross-cutting services (AI, R2, payment, email) live under `src/server/service/`.

---

## 3. Database Schema (Drizzle) — full blueprint

### 3.1 Shared base columns (`src/db/helpers/base.columns.ts`)

Ported verbatim from the reference, minus team concerns:

```ts
import { createId } from '@paralleldrive/cuid2';
import { text, timestamp } from 'drizzle-orm/pg-core';

export const baseColumns = {
  id: text().$default(() => createId()).primaryKey().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).$onUpdate(() => new Date().toISOString()),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),  // soft delete
} as const;

export const relationConfig = {
  cascade: { onDelete: 'cascade', onUpdate: 'cascade' },
  setNull: { onDelete: 'set null', onUpdate: 'cascade' },
  restrict: { onDelete: 'restrict', onUpdate: 'cascade' },
} as const;

export const numericConfig = { mode: 'number', precision: 20, scale: 2 } as const;

export const skipBaseColumns = { createdAt: true, updatedAt: true } as const;
// used in validation .omit() so the server sets these, never the client
export const skipBaseColumnsWithUserId = { ...skipBaseColumns, userId: true } as const;
```

Every domain table spreads `const { id, ...timestampColumns } = baseColumns;` and adds a `userId` FK (the tenancy boundary, replacing `teamId`).

### 3.2 Tables (maps PROJECT_CONTEXT §14 → concrete Drizzle)

**`auth.schema.ts`** — Better Auth managed. `users` (add `role: text` default `'user'` for the light admin), `sessions`, `accounts`, `verification`. Generated to match Better Auth's Drizzle adapter; we do **not** hand-edit shapes Better Auth owns.

**`design.schema.ts`**
```ts
export const designs = pgTable('designs', {
  id,
  // Anonymous-first: exactly one of userId / anonymousId is set. On signup we backfill userId.
  userId: text('user_id').references(() => users.id, cascade),      // nullable until signup
  anonymousId: text('anonymous_id'),                                // anon session cookie id
  originalImageUrl: text('original_image_url').notNull(),   // R2 key/url
  generatedImageUrl: text('generated_image_url'),           // null until job done
  roomType: roomTypeEnum('room_type').notNull(),
  style: designStyleEnum('style').notNull(),
  prompt: text('prompt'),                                   // user free-text (server prompt stays private)
  isPanorama: boolean('is_panorama').default(false).notNull(),
  jobId: text('job_id'),                                    // Fal queue id
  status: generationStatusEnum('status').default('pending').notNull(), // pending|processing|done|failed
  isSaved: boolean('is_saved').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }), // unsaved auto-expire
  ...timestampColumns,
}, (t) => [index('designs_user_idx').on(t.userId)]);

export const designTags = pgTable('design_tags', {
  id,
  designId: text('design_id').references(() => designs.id, cascade).notNull(),
  furnitureItemId: text('furniture_item_id').references(() => furnitureItems.id, setNull),
  xCoord: numeric('x_coord', numericConfig).notNull(),  // 0..1 relative pin position
  yCoord: numeric('y_coord', numericConfig).notNull(),
  ...timestampColumns,
});
```

**`furniture.schema.ts`** — `furniture_items`: name, brand, category, dimensions (jsonb `{w,h,d}`), `priceBdt` (numeric), imageUrl, productUrl, `condition` (new|used enum), `source` (brand|bikroy|fb_marketplace enum), `vendorId` FK. Hand-curated to start (§15.6).

**`vendor.schema.ts`** — `vendors`: name, `type` (brand|used_seller|carpenter|interior_firm), contact, `isVerified`, `commissionRate` (numeric). Owned by admin role, not end users.

**`billing.schema.ts`** — `credits` (userId, freeUsed, paidCredits, plan), `payments` (userId, amountBdt, provider=sslcommerz, tranId, status, raw jsonb).

**`event.schema.ts`** — `events` (userId nullable for anon, `eventType` enum: generation|tag_click|buy_click|share|save|regenerate, `metadata` jsonb, createdAt). **Instrumented from day one** — this is the vendor sales pitch (§10). Indexed on `eventType` + `createdAt`.

**`shared.schema.ts`** — all `pgEnum`s centralized: `designStyleEnum`, `roomTypeEnum`, `conditionEnum`, `sourceEnum`, `generationStatusEnum`, `eventTypeEnum`, `vendorTypeEnum`, `planEnum`.

### 3.3 Client (`src/db/client.ts`)

Reference uses **`pg` (node-postgres) + `Pool`** singleton with `global.__db__` HMR guard and `casing: 'snake_case'`. **Adaptation for PROJECT_CONTEXT:** Supabase Postgres requires the **pooled connection string (port 6543, transaction pooler)** for app runtime; **direct connection only for migrations**. So:

- `DATABASE_URL` → pooled (6543), used by `db` at runtime.
- `DIRECT_URL` → direct (5432), used by `drizzle.config.ts` for generate/migrate.
- Keep the reference's env-sized pool + shutdown handlers.

### 3.4 Migrations

`drizzle.config.ts`: `schema: './src/db/schemas/*'`, `dialect: 'postgresql'`, `casing: 'snake_case'`, `dbCredentials: { url: DIRECT_URL }`. Local dev: `db:push`. Migrations generated for deploy, not committed per-branch (reference convention).

---

## 4. Validation & Types (front↔back, zero redefinition)

Single Zod schema per entity in `src/db/validations/<module>.validation.ts`, seeded from the Drizzle table:

```ts
// design.validation.ts
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { designs } from '@/db/schemas/design.schema';
import { skipBaseColumnsWithUserId } from '@/db/helpers/base.columns';

export const CreateDesignSchema = createInsertSchema(designs)
  .omit({ ...skipBaseColumnsWithUserId, id: true, status: true, jobId: true, generatedImageUrl: true })
  .extend({
    prompt: z.string().max(500).optional(),
  });

export const GenerateRequestSchema = z.object({          // narrow, hand-written input for the AI job
  designId: z.string(),
});

export type CreateDesignInput = z.infer<typeof CreateDesignSchema>;
```

- Same schema object: server `.input(CreateDesignSchema)` **and** client `zodResolver(CreateDesignSchema)` + `useForm<CreateDesignInput>`.
- Update schemas: `CreateXSchema.partial().extend({ id: z.string() })`.
- Result/list types inferred: `export type DesignDetails = Awaited<ReturnType<typeof DesignService.getById>>;`
- `PromiseResult<T>` helper lives in `src/lib/types/utils.ts` exactly as the reference.

---

## 5. Server Layer (oRPC) — the canonical module

Adapting the tax-code router to our userId-scoped, no-audit, no-permission world. Example: **design module**.

### 5.1 Service (`app/(app)/create/_modules/design.service.ts`)
```ts
import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { designs } from '@/db/schemas/design.schema';
import type { CreateDesignInput } from '@/db/validations/design.validation';

export const DesignService = {
  create: async (input: CreateDesignInput & { userId: string }) => {
    const [row] = await db.insert(designs).values(input).returning();
    return row ?? null;
  },
  getById: async ({ id, userId }: { id: string; userId: string }) => {
    const [row] = await db.select().from(designs)
      .where(and(eq(designs.id, id), eq(designs.userId, userId), isNull(designs.deletedAt)));
    return row ?? null;
  },
  getPaginated: async (/* ContextSearchParams + userId */) => { /* withPagination + count */ },
  setResult: async ({ id, generatedImageUrl, status }: ...) => { /* update after job */ },
};
```

### 5.2 Router (`app/(app)/create/_modules/design.router.ts`)
```ts
import 'server-only';
import { z } from 'zod';
import { protectedProcedure } from '@/server/rpc/procedures';
import { cacheKey } from '@/config/cache-tags';
import { cacheConfig } from '@/lib/utils/cache';
import { invalidateCache } from '@/lib/utils/invalidate-cache';
import { CreateDesignSchema } from '@/db/validations/design.validation';
import { DesignService } from './design.service';
import { FalService } from '@/server/service/ai/fal.service';
import { EventService } from '@/server/service/event.service';

const cached = {
  byId: async (userId: string, id: string) => {
    'use cache';
    cacheConfig('transactional', cacheKey.design.byId(userId, id));
    return DesignService.getById({ id, userId });
  },
};

export const designRouter = {
  getById: protectedProcedure.route({ method: 'GET' })
    .input(z.object({ id: z.string() }))
    .handler(({ input, context }) => cached.byId(context.userId, input.id)),

  // POST: create the design row + kick off the async Fal job. Returns { designId, jobId } immediately.
  generate: protectedProcedure.route({ method: 'POST' })
    .input(CreateDesignSchema)
    .handler(async ({ input, context }) => {
      // 1. credit check (throw ORPCError('FORBIDDEN') if over free cap)
      // 2. create design row (status: 'pending')
      const design = await DesignService.create({ ...input, userId: context.userId });
      // 3. submit Fal queued job (server-side prompt assembly — PRIVATE)
      const { jobId } = await FalService.submit({ design });
      await DesignService.update({ id: design.id, jobId, status: 'processing', userId: context.userId });
      // 4. fire-and-forget event log
      EventService.log({ userId: context.userId, eventType: 'generation', metadata: { style: input.style } });
      invalidateCache(cacheKey.design.byId(context.userId, design.id));
      return { designId: design.id, jobId };
    }),

  // GET: polled by the client until status === 'done' | 'failed'
  status: protectedProcedure.route({ method: 'GET' })
    .input(z.object({ designId: z.string() }))
    .handler(async ({ input, context }) => {
      const design = await DesignService.getById({ id: input.designId, userId: context.userId });
      if (design?.status === 'processing' && design.jobId) {
        const result = await FalService.check(design.jobId);   // poll Fal
        if (result.done) {
          const url = await R2Service.store(result.imageUrl);  // persist to R2
          await DesignService.setResult({ id: design.id, generatedImageUrl: url, status: 'done', userId: context.userId });
          invalidateCache(cacheKey.design.byId(context.userId, design.id));
          return { status: 'done' as const, generatedImageUrl: url };
        }
      }
      return { status: design?.status ?? 'failed' };
    }),
};

export type DesignDetails = Awaited<ReturnType<typeof DesignService.getById>>;
```

### 5.3 Auth middleware (`src/server/rpc/procedures.ts`)
`publicProcedure` (no auth) and `protectedProcedure` (Better Auth session → `context.userId`; throws `ORPCError('UNAUTHORIZED')` if none). A light `withRole('admin')` middleware guards the catalog admin routes. **No teamId, no RBAC permission matrix.**

### 5.4 Wiring
- `src/server/rpc/router.ts` merges all module routers into `webRouter`.
- `api/rpc/[[...rest]]/route.ts` serves it (`createHandler(webRouter, { prefix: '/api/rpc' })`).
- `server.ts` → `serverRpc` (in-process, `'server-only'`) for Server Components.
- `client.ts` → `rpc` (HTTP) for `'use client'`; GET for queries, POST for mutations.
- `query.ts` → `orpc = createTanstackQueryUtils(rpc)` for TanStack Query hooks (used for the **status polling** via `useQuery({ refetchInterval })`).

---

## 6. Caching

Next.js 16 Cache Components, wrapped exactly as the reference:
- `cacheConfig(profile, ...tags)` in `lib/utils/cache.ts` (`'use cache'` first statement, then this). Profiles defined in `next.config.ts`: `realtime | transactional | analytical | session | master`.
- `cacheKey.*` centralized in `config/cache-tags.ts`, scoped by `userId` (not teamId): `cacheKey.design.byId(userId, id)`, `cacheKey.furniture.all()`.
- `invalidateCache(tag, mode)` after every mutation. In-flight AI jobs use `realtime`/short TTL so polling sees fresh status.

---

## 7. Client / Server Boundary

Same two mechanisms as the reference:

- **List/detail into a page:** `_modules/promises.ts` exports a factory returning an object of un-awaited `serverRpc.*` promises → `<QueryProvider promises={...}>` (async server component) awaits them → `DataProvider` context → client reads `useDataProvider<T>()`. Wrapped in `<Suspense>` for streaming.
- **Live client reads/mutations:** `rpc.*` / `orpc` over HTTP inside `'use client'`. The **generate → poll** loop is a client `useMutation` (generate) then `useQuery` with `refetchInterval` (status) until `done`.
- Enforcement: `'server-only'` on services/`serverRpc`/cache; `'use client'` only on forms, pins, galleries, poll hooks.

---

## 7b. Design System (extracted from `/design/Home AI Screens.dc.html`)

A complete visual design already exists (Claude design-canvas export, 9 desktop + full mobile core-flow + mobile supporting screens). It is the **source of truth for UI**. Extract it into Tailwind theme + shadcn tokens in Phase 1.

**Brand:** "হোম এআই · Home AI". Domain shown as `homeai.com.bd`. Logo = rounded-square "H" in deep green.

**Palette:**
| Token | Hex | Use |
|-------|-----|-----|
| Primary green | `#1C4E3F` | buttons, pins, active states, logo |
| Primary green (hover/dark) | `#123A2E` | link hover, dark text accents |
| Ink | `#16352B` | headings |
| Body text | `#47514A` / `#707B70` | body / muted |
| Faint text | `#98A093` | placeholders, captions |
| Page bg (canvas) | `#E8EBE2` | outer background |
| Surface bg | `#F5F6EF` / `#FBFBF5` | screen background / sheets |
| Soft green fill | `#E6EDE4` | chips, selected tiles, credit badge |
| Accent gold | `#A9791F` / `#6E4E12` | **used/second-hand** price emphasis (Bikroy) |
| WhatsApp green | `#25D366` | share button |
| Border | `rgba(22,44,36,.12–.15)` | card/input borders |

**Typography:** Bangla-first. `Noto Serif Bengali` (500–800) for headings/numerals; `Hind Siliguri` (400–700) for body/UI. Both via Google Fonts. Numerals render in Bengali digits (৳৪২,০০০, ৯:৪১, ৫টির মধ্যে ৪টি).

**Shape & depth:** generous radii (cards 15–20px, tiles 12–16px, buttons 13–14px, pills/pins 99px, phone frame 40px); soft green-tinted shadows (`0 8px 22px rgba(24,44,34,.06)` cards, deeper for hero/modals).

**Signature components (already designed — build these):**
- **Before/After slider** — split image w/ "আগে/পরে" pills + center ↔ handle (landing hero).
- **Furniture price pins** — absolute-positioned numbered green circle + BDT price pill, overlaid on the generated image (0–1 relative coords → `design_tags.x/yCoord`).
- **Furniture bottom sheet** (mobile) / **modal** (desktop) — product shot, dimensions, big BDT price, **"নতুন কিনুন" (Buy New, green)** + **"ব্যবহৃত কিনুন" (Buy Used, gold-bordered, Bikroy)** rows, "same in other brands" chips.
- **Free-credit badge** — 5-dot meter + "৫টির মধ্যে ৪টি ফ্রি ডিজাইন বাকি".
- **Generating state** — spinning ring + pulsing "H", progress bar, step caption ("আসবাব বসানো হচ্ছে..."), "জানেন কি?" tip card. Matches the async-poll flow.
- **Step indicator** — ১ ছবি › ২ স্টাইল › ৩ নতুন ঘর.
- **Mobile phone frame** — status bar (৯:৪১), 410px width, back chevron headers.

**Screen inventory (design → routes in §8):** Landing, Upload (drag/drop + camera + 360° panorama, room-type grid: বসার ঘর/শোবার ঘর/খাবার ঘর/রান্নাঘর/**নামাজের কোণ**/বাচ্চাদের ঘর), Style (grid: আধুনিক/ঐতিহ্যবাহী বাংলা/মিনিমাল/বিলাসবহুল/স্ক্যান্ডিনেভিয়ান/ক্লাসিক + budget কম/মাঝারি/প্রিমিয়াম + free-text), Generating, Result (pins + regenerate/other-style/save/share), Furniture detail, Saved gallery, Auth, Pricing. Both desktop & mobile laid out.

> The `budget` tri-state (কম/মাঝারি/প্রিমিয়াম) in the Style screen maps naturally to the **plan-driven model tier** (decision #10) and cost control (§9.4 high-res = premium).

## 7c. Modal / Sheet System (adopted from reference, shadcn-backed)

The reference drives all pop-up UI **imperatively via Zustand stores** — you never hand-wire `<Dialog open={...}>` with local `useState` at call sites. We adopt this pattern (it's the genuinely reusable part), backed by **shadcn primitives** instead of the reference's base-ui/vaul mix (per decision #5). We deliberately skip the reference's dead `Prompt` system.

**Two stores, one renderer each, mounted once in the root layout:**

| Store | Hook | Backs | Use for |
|-------|------|-------|---------|
| **Modal** | `useModal().openModal(config)` | shadcn `Dialog` (centered) + `AlertDialog` | centered dialogs, **confirm/destructive** actions. Our **furniture detail on desktop**. |
| **Sheet** | `useSheet().openSheet(config)` | shadcn `Sheet` (side) + a **bottom-sheet** variant (vaul/`Drawer` or shadcn Sheet `side="bottom"`) | drawers + **forms** (furniture/vendor admin CRUD). Our **furniture detail on mobile** (bottom sheet). |

**Location (single-app):** `src/components/ui/` for shadcn primitives; `src/components/modal/{modal.store.ts, modal.tsx, sheet.store.ts, sheet.tsx, confirm.tsx}`. Renderers mounted in `src/app/layout.tsx` (or the `(app)` layout).

**Imperative API (mirrors reference):**
```ts
// centered dialog / custom component
openModal({ type: 'custom', title?, component: FurnitureDetail, props: { itemId } });
// confirm / destructive (prebuilt) — for "delete design", "use a credit", etc.
openModal({ type: 'alert', variant: 'destructive', title, description,
            component: ConfirmDelete, props: { handlerFn: () => deleteDesign(id) } });
// sheet / drawer with a form — injects closeSheet as a prop to the component
openSheet({ component: FurnitureForm, title: 'Edit item', props: { item }, side: 'right' });
```
- Config = `{ type, title?, description?, variant?, component: React.ComponentType, props?, side? }`. Optional `title`/`description` render built-in chrome + close button; omit to let the component own its layout.
- **Result handling** = pass an `onConfirm`/`handlerFn` callback (no promise-returning API), wrapped in a loading state (React 19 `useActionState` / `useTransition`) so buttons show pending/disabled while the async action runs. The **opener owns the rpc call + toast + refresh**; the modal component stays presentation-only (reference convention).
- **Store lib:** Zustand (`createWithEqualityFn` + `shallow`) — matches reference; single active modal (not a stack), reset on route change.
- **Prebuilt confirms:** `ConfirmDelete` (destructive), `ConfirmAction` (info) — one-liners for the common destructive/confirm cases.

> **Our design's furniture panel maps directly:** `FurnitureDetail` is one component opened via `openModal` (desktop centered) **or** `openSheet({ side: 'bottom' })` (mobile bottom sheet) — matching the design's modal/bottom-sheet split. Use the `responsive-modal` idea (dialog on `lg:`, sheet below) or branch on a breakpoint hook at the call site.

## 8. Screens → Modules (PROJECT_CONTEXT §7)

| Screen | Route | Server pieces |
|--------|-------|---------------|
| Landing | `(marketing)/page.tsx` | static + a few `events` logs (public) |
| Upload + style | `(app)/create/` | `design.router.generate`, R2 presign |
| Generating | client poll state on `result/[id]` | `design.router.status` |
| Result + pins | `(app)/result/[designId]/` | `design.getById`, `designTag` reads, `furniture.getById` |
| Furniture detail | sheet on result | `furniture.router.getById`, `event: tag_click`/`buy_click` |
| Saved gallery | `(app)/designs/` | `design.getPaginated` (isSaved) |
| Auth | `(auth)/` | Better Auth (Facebook, Google, email) |
| Pricing/credits | `(app)/pricing/` | `billing.router`, SSLCommerz init |
| Admin catalog | `admin/` | `furniture`/`vendor` routers, `withRole('admin')` |

Forms use plain shadcn + `react-hook-form` + `zodResolver(schema)` (decision #5). `@tanstack/react-query` for client fetching. `browser-image-compression` on upload (cost control §9.6).

---

## 9. Cross-cutting Services (`src/server/service/`)

- **`ai/` — plan-driven provider abstraction.** A `resolveModel(plan)` returns `{ provider, model, resolution }` (e.g. free → Z-Image/Flux low-res; paid → Seedream; premium → Nano Banana + high-res, per PROJECT_CONTEXT §5 & §9.4). A provider interface (`submit()` queued job, `check(jobId)`) is implemented by `fal.service.ts` first; Replicate/Google can be added behind the same interface later. Server-side private prompt assembly (§12). Called from routers only; API key server-side only.
- **`storage/r2.service.ts`** — `@aws-sdk/client-s3` + presigner. Presigned PUT for uploads, store generated images, long cache headers. $0 egress.
- **`payment/sslcommerz.service.ts`** — init transaction, validate IPN. Webhook at `api/webhooks/sslcommerz`.
- **`email/resend.service.ts`** — Better Auth password reset / verification.
- **`event.service.ts`** — `log()` fire-and-forget into `events`. **Instrumented everywhere.**

---

## 10. Environment Variables (`.env.example`)

```
DATABASE_URL=            # Supabase pooled (6543)
DIRECT_URL=              # Supabase direct (5432) — migrations only
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
FACEBOOK_CLIENT_ID= / FACEBOOK_CLIENT_SECRET=
GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET=
FAL_KEY=                 # (or REPLICATE_API_TOKEN)
R2_ACCOUNT_ID= / R2_ACCESS_KEY_ID= / R2_SECRET_ACCESS_KEY= / R2_BUCKET= / R2_PUBLIC_URL=
SSLCOMMERZ_STORE_ID= / SSLCOMMERZ_STORE_PASSWORD= / SSLCOMMERZ_IS_LIVE=
RESEND_API_KEY=
POSTHOG_KEY= / POSTHOG_HOST=
```

---

## 11. Build Order (reconciles PROJECT_CONTEXT §15 with our decisions)

**Phase 0 — Validation (PROJECT_CONTEXT §11, §6). No app code.**
- Run a real BD room photo + panorama through Seedream 4.5 / Nano Banana on Fal. Judge quality.
- Validate host timeout behavior for a 10–30s AI call → confirms the async-job design.
- *Gate: only proceed if output quality clears the bar.*

**Phase 1 — Scaffold.** Next.js + TS + Tailwind + shadcn; Bun + Biome; design-system theme (Noto Serif Bengali + Hind Siliguri fonts, green palette, radii/shadows from §7b); modal/sheet system (§7c); Zod env module + Pino logger; providers.

> **⚠️ Frontend-first build order (user decision).** Screens are built BEFORE the backend, against a **typed-contract layer** so nothing gets reworked when the backend lands:
>
> **Stage A — Scaffold** ✅ DONE (commit 75aa6a0).
> **Stage B — Type contracts only** ✅ DONE (commit 0c2890c): `db/schemas/*` + `db/validations/*` + inferred types. No client/routers/services — shapes only.
> **Stage C — All screens** ✅ DONE (commit b8918ba): all real routes, mobile + desktop, rendering **typed mock data**. Core flow + landing + auth + pricing + gallery + admin.
> **Stage D — Backend** ⏭️ NOT STARTED (paused by user): oRPC wiring + Better Auth + services. Swap mock → real behind existing types. **See `BUILD_STATUS.md` for the exact resume steps + mock→real swap points.**
>
> Phases 2–6 below describe Stage D's per-feature backend work.

**Phase 2 — Core flow (backend).** Upload (compress → R2 presign) → style select → `design.generate` (async Fal job) → poll `design.status` → result screen with generated image. Event logging live from the first generation.

**Phase 3 — Storage + credit caps.** R2 store/serve, unsaved auto-expire, free-generation cap enforcement, save/download.

**Phase 4 — Furniture tagging + catalog.** `furniture`/`vendor` schemas, hand-curated seed, `design_tags` pins on result, furniture detail sheet with Buy New / Buy Used links + `tag_click`/`buy_click` events. Admin CRUD (`withRole('admin')`).

**Phase 5 — Bangla UI.** `lib/i18n` bn/en dictionaries, Bangla-first with English toggle, BDT (৳) formatting.

**Phase 6 — Payments.** SSLCommerz (bKash/Nagad) init + webhook, credit packs.

**Phase 7 — Business validation.** Land ONE furniture vendor or interior firm (PROJECT_CONTEXT §15.10). The `events` metrics are the pitch.

---

## 12. Resolved / Remaining Items

**Resolved (see §0 rows 8–10):** anonymous-first auth gate; Better Auth CLI-generated tables; Fal.ai first with a plan-driven provider abstraction.

**Anonymous-first mechanics** (now the design):
- Anon session id set in an HTTP-only cookie on first visit. `designs` and `events` carry `anonymousId` (nullable `userId`).
- Free-cap counting keyed by `anonymousId` pre-signup, `userId` post-signup.
- **On signup, backfill:** migrate the anon session's `designs`/`events` to the new `userId` (chosen "link on signup" behavior). One transactional update keyed on `anonymousId`.
- ⚠️ Anon caps are only as strong as the cookie — trivially reset by clearing cookies/incognito. Acceptable for MVP (the cap is cost-control, not security); tighten later with IP/device heuristics if abuse appears.

**Remaining:**
1. **Hosting** — deferred by you; the async-job design keeps us host-independent regardless.
2. **Plan → model matrix** — the exact `{ plan: provider+model+resolution }` mapping (free/paid/premium) can be finalized after Phase 0 quality results tell us which models clear the bar.

---

*End of plan. Nothing here is built yet — this is the blueprint for approval.*
