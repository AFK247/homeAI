# BUILD STATUS — Home AI (হোম এআই)

> Handoff snapshot. Read this to resume work. Companion docs: `PROJECT_CONTEXT.md` (what/why),
> `IMPLEMENTATION_PLAN.md` (full architecture + conventions), `CLAUDE.md` (rules for the AI agent).
> Last updated: 2026-07-19.

---

## TL;DR — where we are

**The product is built and working end-to-end on a real backend.** The frontend-first phases (1A–1C)
AND the full backend (1D) are done: real database, auth, AI generation, credits, payments (sandbox),
the whole admin panel, catalog scraping/ingest, analytics, and abuse defense are all wired. No more
mock data — the app runs against Postgres + the real services.

| Phase | What | Status |
|-------|------|--------|
| 1A | Scaffold (Next.js 16 + Bun + Tailwind + shadcn + Biome + design system + modal system) | ✅ done |
| 1B | Type contracts (Drizzle schemas + Zod validations + inferred types) | ✅ done |
| 1C | All screens (real routes) | ✅ done |
| 1D | Backend (oRPC routers + services + Better Auth + Cloudflare/OpenRouter AI + R2/S3 + SSLCommerz + Resend) | ✅ done |

**Everything builds, typechecks (strict + extras), and passes Biome.** What remains is **coverage,
depth, and go-live**, not core features — see "What's left" below.

---

## Run it

```bash
cd /Users/asifferdous/Desktop/wwww/PERSONAL/homeai
bun install
bun dev              # → http://localhost:3000
```
Commands: `bun run build`, `bun run typecheck`, `bun run check` (Biome, read-only),
`bun run db:push` (push Drizzle schema).

Needs a `.env` (see `.env.example`, Zod-validated at boot). Local dev uses Postgres + MinIO (S3);
prod swaps in Supabase + R2. SSLCommerz runs on **sandbox** (`SSLCOMMERZ_IS_LIVE=false`).

---

## Decisions locked (so you don't re-litigate)

Package manager **Bun** · **oRPC routers only** (no `use server` builder) · scope rows by **`userId` /
`anonymousId`** (no teams/RBAC/audit) · **anonymous-first** generation (claimed on signup) · Better
Auth (Facebook+Google+email) · **credits are the source of truth** for free/paid usage (not a render
counter) · **AI provider chain** (Cloudflare Workers-AI + OpenRouter, ordered fallback, plan-driven) ·
input schemas via **`createInsertSchema` + refine** · **Biome** · **Pino** logs + `events` table for
product analytics · **Zod-validated env** · bn/en dictionary i18n (Bangla-first; admin English-only) ·
**no tests / no git hooks** yet. Full rationale: `IMPLEMENTATION_PLAN.md §0/§0b`.

---

## What's built (by area)

### Core user flow
- **Anonymous-first generation** — upload → style/room/budget → AI redesign → result with furniture
  pins. Regenerate produces new versions. Real image upload → S3/R2, async AI, pin detection.
- **AI provider chain** (`src/server/service/ai/`) — Cloudflare Workers-AI + OpenRouter providers with
  ordered fallback (`providers/registry.ts`); each provider's `isReady()` gates it. Vision tagging
  (moondream) detects furniture → `design_tags`.
- **Furniture pins → catalog** — tap a pin → "shop similar" by category; some pins link to an exact
  product (see matching coverage under "What's left").

### Auth & account
- Better Auth (Facebook + Google + email), forgot/reset password (Resend), `/account` profile page
  (name, password, sign-out-other-devices), profile dropdown, claim-anonymous-designs-on-signup.

### Credits & payments
- **Credit system** (`billing.schema` + `credit/`): cached balances + append-only ledger; anon grant
  (10) / signup grant (20) / purchase; reserve-before-AI + refund-on-failure. Composite-identity
  anti-farming (cookie + IP + **device fingerprint**).
- **SSLCommerz payments** (`payment/` + `/api/payments/sslcommerz/*`): pack + open top-up checkout,
  IPN + validation-API confirm, idempotent grant. **Sandbox** wired; live needs a merchant account.
- **Pricing** (`/pricing`): bilingual — Bangla → ৳ (bKash/Nagad) lane, English → $ lane, ৳/$ toggle.

### Admin panel (`/admin`, English-only) — grouped nav: Activity / Catalog / Billing / System
- **Overview** — headline stats + charts (designs-over-time, engagement funnel, styles, gen success).
- **Activity**: Designs, Events, Generations (per-attempt cost/latency logs).
- **Catalog**: Furniture (full CRUD), Categories (+ Vendor mappings tab-route), Vendors (CRUD),
  Catalog scraping (local-only scrape → compare → ingest, SSE live).
- **Billing**: Users & usage (per-owner rollup), Payments (revenue), Credit ledger.
- **System**: AI Provider (live quota/balance/neuron health).

### Abuse defense (`src/server/service/rate-limit/`)
- Guard chain: **daily global cap** (bill breaker) → **per-caller burst** limit. Free-user limits are
  the **credit system's** job (not a guard), keyed fingerprint-first.
- **Device fingerprint** (ThumbmarkJS) — `lib/fingerprint.ts` computes it, the rpc client sends
  `x-device-fingerprint`, the server keys anti-farming + burst on it fingerprint-first (shared-WiFi
  safe: distinct devices on one IP don't block each other).

### Analytics
- `events` table (generation / tag_click / buy_click / share / save / regenerate) — the vendor
  sales-pitch metrics, surfaced on the admin overview + Events page.

---

## What's left (coverage / depth / go-live — not core features)

### 🔴 Core product value
1. **Furniture matching coverage** — only a minority of design pins link to an *exact* product; the
   rest fall back to "shop similar by category". Improving the crop → embed → pgvector match pipeline
   is the highest-impact remaining work (the marketplace IS the product).
2. **Catalog depth** — a modest number of products across a few vendors. The scraper + admin ingest UI
   are built; running deeper scrapes + more vendors directly improves match rate (compounds with #1).

### 🟡 Abuse defense
3. **Cloudflare Turnstile** — the only `TODO (deferred)` left in code (`rate-limit/registry.ts`).
   Fingerprinting stops human farmers; Turnstile stops scripted bots (no fingerprint). Needs Turnstile
   keys + one new guard file.

### 🟢 Production go-live (config/ops)
4. **SSLCommerz live** — currently sandbox; needs a registered merchant account, then flip
   `SSLCOMMERZ_IS_LIVE=true` + real store keys.
5. **R2 for prod image storage** — env keys exist; local uses MinIO.
6. **BD open top-up** — the ৳ "enter any amount" field on the BDT pricing lane (USD lane has it).

### ⚪ Housekeeping
7. **Tests / CI / git hooks** — a locked "not yet" decision.
8. **Schema nits** — `scrape_jobs.status` and `usage_events.action` are plain text where an enum fits.

---

## Recommended order (for launch)
1. Furniture matching coverage (#1) — turns "shop similar" into "buy this exact piece".
2. Catalog depth (#2) — compounds with #1.
3. SSLCommerz live (#4) — to take real money.
4. Turnstile (#3) — bot defense before public traffic.
