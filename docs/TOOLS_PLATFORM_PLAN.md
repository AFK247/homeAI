# Multi-tool platform — architecture plan

> Status: **PROPOSAL / design only** (no code). Turning Home AI from a single interior-design app
> into a **multi-tool AI platform** on one shared credit/auth/AI spine. First two tools:
> **background remover** + **passport-photo maker**. Last updated: 2026-07-19.

---

## 1. The strategy (why)

**Interior design is high-value but low-frequency** (~2–3 uses/day) and is the product with the real
moat (the furniture marketplace). **Cheap image tools are low-value but high-frequency** (a background
remover / passport-photo maker could see 50–60 uses/day in BD). The idea:

- Use cheap, high-traffic tools as **top-of-funnel** — they cost us ~$0 (idle Cloudflare free-tier
  neurons) but pull a large daily user base.
- Everyone lands in **one account with shared, generous free credits** usable on ANY tool.
- Users try a cheap tool → discover the others → some convert to **paid credits/subscription** when
  their free grant runs out (every tool costs credits, not just interior design).
- Interior design remains the **destination product**; the tools are the **ads**.

**The named risk (hold this the whole way):** shallow tools are commoditized and their users have low
intent for furniture — cross-sell is real but *low-rate*. The failure mode is spending the roadmap on
shallow tools while the deep, defensible product (matching coverage, still ~23%) stalls. **Mitigation:
ship ONE tool first, instrument the cross-sell, and keep interior-design matching in parallel.**

---

## 2. Why this is cheap to build (the spine already exists)

This is NOT a rewrite. Home AI already has every shared system a multi-tool platform needs — the tools
just hang off it:

| Shared system (already built) | What a new tool reuses, unchanged |
|---|---|
| **Credit system** (`billing.schema` + `credit/`) | balance, ledger, reserve-before / refund-on-failure |
| **Model/cost registry** (`credit/models.ts`) | add `"bg-remover": { cost, tier }` — one line |
| **AI provider chain** (`ai/providers/`) | ordered-fallback pattern; add a provider or reuse Cloudflare |
| **Auth** (Better Auth) + **anonymous-first** | one account across all tools; claim-on-signup |
| **Abuse defense** (`rate-limit/` + **device fingerprint**) | same guards + anti-farming, no per-tool work |
| **Storage** (`StorageService`, S3/R2) | put input / result blobs |
| **Payments** (`payment/`, SSLCommerz) | same checkout tops up the same shared credits |
| **i18n** (bn/en), **modal system**, **design system** | same UI primitives |

The credit registry is already **product-agnostic**: it treats "cost" as an abstract number decoupled
from any specific feature (`docs/CREDIT_SYSTEM.md §2`). That's the linchpin — a tool is mostly config.

---

## 3. The reusable "tool" pattern (extracted from the generate handler)

Every AI action in the app already follows ONE spine (see `design.router.generate`). A tool repeats it:

```
guard (abuse defense)
  → reserve credits BEFORE the AI call        (CreditService.reserve — throws if insufficient)
    → store the input blob                     (StorageService.put)
      → run the AI                             (the tool's own provider call)
        → store the result blob                (StorageService.put)
          → on ANY failure: refund             (CreditService.refund — user never charged for nothing)
```

So a tool = **{ its input schema, its AI call, its result shape }** wrapped in that same spine. The
spine is identical; only the middle (the AI call + I/O) differs per tool.

### Proposed shared abstraction: a `ToolService` helper
To avoid copy-pasting the spine into each tool, extract a small helper (server-only):

```ts
runTool({
  toolKey,                 // "bg-remover" | "passport-photo" | "redesign" | …
  context,                 // rpc context (owner + abuse signals)
  input,                   // decoded input (image bytes, options)
  run: (input) => Promise<{ resultBytes, resultMime, meta }>,   // the tool's actual AI work
}) → { resultUrl, meta }   // handles: guard → reserve → store → run → store → refund-on-fail
```

Interior-design's `generate` becomes one caller of this helper (it also writes a `designs` row +
pin detection — that stays design-specific). New tools are thin: define `run`, done.

---

## 4. Tool registry (mirrors the model registry)

A `TOOLS` registry, parallel to `MODELS`, is the single source of truth for what tools exist:

```ts
// src/config/tools.ts  (client-safe: names, icons, credit cost, route — NO model IDs)
export const TOOLS = {
  redesign:       { name: "Interior redesign", cost: 2,  route: "/create",        icon: "…" },
  "bg-remover":   { name: "Background remover", cost: 1,  route: "/tools/bg-remover", icon: "…" },
  "passport":     { name: "Passport photo",     cost: 2,  route: "/tools/passport",   icon: "…" },
} as const;
```
- **Client-safe half** in `config/tools.ts` (name, cost number, route, icon) — powers the tool hub + pricing.
- **Server-only half** in `credit/models.ts` (the real model IDs each tool uses) — never leaks.
- Adding a tool = one registry entry + one module. The hub, credit accounting, and pricing pick it up.

---

## 5. Routing / UX shape

- **`/` (landing)** → evolves into (or gains) a **tool hub**: a grid of tool cards (icon, name,
  "N credits", "X free"). Interior design is the hero card; the others are siblings. Keeps ONE central
  entry so free credits + account are shared and discovery is natural.
- **`/tools/bg-remover`, `/tools/passport`** → each a focused single-purpose page (upload → run →
  download), reusing the upload panel, modal system, credit badge, and result view primitives.
- **`/create`** (interior design) stays as-is — it's just the richest tool.
- **Credit badge** (already global) shows the shared balance everywhere.
- **Cross-sell hooks:** after a bg-remove, a subtle "Try redesigning your room →" card; on the result
  screen, "You have N credits — also try …". Instrument clicks to measure funnel.

---

## 6. Per-tool module shape (convention-compliant)

Each tool is a colocated module, same as every feature (`docs/module-convention.md`):

```
src/app/tools/bg-remover/
  page.tsx                      # the tool screen (client upload + result)
  _modules/
    bg-remover.router.ts        # publicProcedure.run → ToolService.runTool(...)
    bg-remover.service.ts       # 'server-only'; the AI call + result handling
src/config/tools.ts             # +1 registry entry (client-safe)
src/server/service/credit/models.ts   # +1 model entry (server-only cost/tier)
src/server/service/ai/providers/…     # a provider for the tool's model (or reuse Cloudflare)
```

No new shared infra per tool — they all lean on the spine in §2–3.

---

## 7. The two first tools

### A. Background remover (build FIRST — the funnel test)
- **Why first:** broadest appeal, purely image-in → image-out, ONE AI call, no catalog/matching, cheapest
  to build, highest expected daily traffic → the cleanest test of the whole thesis.
- **AI:** a background-removal / segmentation model (e.g. a Cloudflare/Workers-AI or an OpenRouter/
  fal-hosted `rembg`/`birefnet`-class model). Same provider-chain pattern; add one provider.
- **Cost:** ~1 credit (near-$0 to us). Output: transparent PNG.
- **Instrument:** daily uses, sign-up rate, and clicks on the "try interior design" cross-sell.

### B. Passport-photo maker (build SECOND)
- **Why:** very high BD demand (visa/passport/forms); strong local need.
- **Extra logic over bg-remover:** remove background → set the required background color (white/blue) →
  crop/resize to spec sizes (e.g. 45×35mm, 2×2in) → optionally a printable sheet (Nx grid). Mostly
  `sharp` (already a dependency) after the bg-removal step.
- **Cost:** ~2 credits.

---

## 8. What stays out of scope (deliberately)

- **No platform rearchitecture** — tools hang off the existing spine; nothing shared is rewritten.
- **Interior-design matching coverage stays the #1 roadmap item in parallel** — the tools are the ads,
  the marketplace is the business. Don't let shallow tools consume the deep product's roadmap.
- **PDF summarization deferred** — different modality (LLM/text), weakest cross-sell to furniture; only
  after the image-tool funnel is proven.
- **No new billing** — same credits, same SSLCommerz checkout tops up the same balance.

---

## 9. Suggested sequence (measured, reversible)

1. **Extract `ToolService.runTool`** from the generate handler (refactor; interior design becomes its
   first caller — proves the abstraction with zero behavior change).
2. **Add the `TOOLS` registry** + a minimal **tool hub** on `/` (interior design + "coming soon" cards).
3. **Ship background remover** end-to-end. Instrument daily use + cross-sell clicks. Run 2–4 weeks.
4. **Decision gate:** funnel works (real traffic + non-zero cross-sell) → add passport photo + more.
   Cross-sell ~zero → keep bg-remover as a standalone credit-earner, stop pouring in, refocus on the
   marketplace. Either outcome is a cheap, useful learning.
5. Throughout: **interior-design matching coverage** progresses in parallel.

---

## 10. Open questions (decide before building)

- Exact credit cost per tool (draft: bg-remover 1, passport 2, redesign 2) — tune vs. real provider cost.
- Which provider/model for bg-removal (Cloudflare has segmentation; else fal/OpenRouter-hosted rembg).
- Free-grant size once the platform is multi-tool — is 10 anon / 20 signup still right when credits burn
  across several tools? (Likely bump the signup grant to make the "generous free" promise land.)
- Does the tool hub REPLACE the current interior-design landing, or sit above it as a chooser?
