# Marketplace implementation plan — catalog + pin-to-product matching

Status: **planning / partially spiked.** This document is the agreed design from a long
working session. It supersedes ad-hoc notes. Read `PROJECT_CONTEXT.md` and
`IMPLEMENTATION_PLAN.md` first for the broader product; this doc is specifically about
turning furniture pins into real, buyable local products — the marketplace itself.

---

## 1. Context & the core problem

Home AI's business is the **local furniture marketplace**; the AI redesign is the
acquisition hook. For the marketplace to exist, every furniture pin the AI places on a
redesigned room must link to a **real, buyable product from a real Bangladeshi vendor**.

Today pins carry `furnitureItemId: null` (`design.service.ts` `setVisionTags`) — they
show a label like "সোফা" but link to nothing, because **there is no catalog data in the
DB**. Closing that gap is the whole job.

Two sub-problems:
- **Problem A — the catalog:** get real vendor products (name, price, image, category)
  into `furnitureItems`.
- **Problem B — matching:** given a detected furniture pin, show the right real products.

---

## 2. Decisions made this session (and the reasoning)

These were reached by stress-testing, and several **reverse** earlier ideas. Recorded so
future-us remembers *why*.

### 2.1 Matching = category + region. **Vectors/embeddings are REJECTED.**
We seriously considered visual similarity (crop the AI furniture → embed → pgvector
match against catalog image embeddings). **Rejected**, because:
- The AI furniture is imaginary — exact visual match is impossible; best case is a soft
  "looks similar" ranking.
- Catalog images are inconsistent (clean product shots *and* full-room scenes), so you'd
  have to **crop the catalog images too**, through the same detector — doubling AI cost.
- Catalogs change constantly → perpetual re-crop/re-embed maintenance.
- Net: high cost + high maintenance + ongoing latency for marginal ordering benefit.
**Conclusion:** not worth it. Match on **category + region**, order by something simple
(featured vendor / price / newest). Honest framing everywhere: **"shop similar," not
"exact match."**

### 2.2 Controlled vocabulary — a DB-backed master category system, obeyed by BOTH sides.
The failure mode of category matching is vocabulary drift: the AI says "couch," the
catalog says "sofa," the query finds nothing. Fix: a **single master category set is the
source of truth**, and *both* the scraper (catalog side) and the AI classification (pin
side) resolve into it. This makes pin category == furniture category by construction — the
query always lines up. This replaces the vector idea as the matching backbone.

**Decided: this is a real, DB-backed, admin-managed system (not a hardcoded list),**
because there will be 100+ categories and they evolve as vendors are added:
- **`categories` master table** — flat list (no hierarchy), seedable, and **editable from
  the admin UI**. English names only for now (Bangla `nameBn` added later via admin).
- **Vendor category mapping** — each vendor names the same thing differently ("Bar-Stool"
  / "stool" / "high chair"). A **mapping from each vendor's raw category → one master
  category** collapses them. Stored, not guessed at query time.
- **AI does the mapping, precomputed & reviewed.** Before ingesting a vendor, gather ALL
  its raw categories, have the AI map them **in one batch** to master categories; the AI
  **may propose NEW master categories** when nothing fits.
- **Pending-until-approved gate.** AI-created categories and AI mappings land in a
  `pending` status and only go live after the admin approves them (a `status` column).
  Keeps the master list clean and under human control.
- Matching still needs an **"other/none"** bucket so an unmappable item isn't force-fit.

### 2.3 Catalog source = scraping (proven feasible & legal-enough).
No vendor offers an API. Scraping public pages is the only path, and it works — see the
PoC (§4). Legality: scraping **public, logged-out** product *facts* (name/price/dims) is
**not criminal** (settled by hiQ v. LinkedIn 2022, Meta v. Bright Data 2024); Bangladesh's
cyber/data laws target hacking and *personal* data, not product listings; both target
vendors' `robots.txt` **explicitly allow crawling** (Hatil `Allow: /`, Brothers `Allow: /`
+ sitemaps). Guardrails to stay clean: **only public pages, never defeat anti-bot/login,
scrape politely, link back to the vendor to buy** (aggregator posture, like Google
Shopping), and **pursue partnerships as we grow**. (Not legal advice; a one-hour BD
IP-lawyer consult before scaling is cheap insurance.)

### 2.4 Images — hotlink for now, download later.
Vendor image hosts may block hotlinking (referrer protection). **Decision for the preview
stage: hotlink the vendor `imageUrl` directly and accept occasional broken images.** The
robust production answer (download to our R2 and serve our copy) is deferred — noted, not
built now.

### 2.5 Scale & freshness (answered, deferred to production).
Not a blocker: production scraping runs ~10–20 pages in **parallel** (10k products in
<1h, not 7h). Freshness via **sitemap `<lastmod>` diffing** — re-scrape only changed
products (a few hundred/day = minutes), add new ones, soft-delete (`isActive=false`) ones
that vanish — run as a **cron** (the repo already has a cron file). Build later.

### 2.6 Two-lane region (BD / INTL) — carried over, applied here as a filter.
From the earlier region design: a `region` value (`bd` | `intl`) with same-lane
isolation. In THIS plan it shows up as one thing: **`furnitureItems.region` + every
catalog/match query filters by the viewer's region.** Full two-lane work (currency,
payments) stays in its own effort; here we only need the `region` column + filter so the
catalog is lane-correct from day one.

---

## 3. The category system (DB-backed)

Two new tables:

**`categories`** (master, flat):
- `id`, `name` (English, unique — the canonical bucket, e.g. "sofa"), `nameBn` (nullable,
  later), `status` (`active` | `pending`), `isActive`, timestamps, `deletedAt`.
- Seeded initially from the real Hatil+Brothers vocabulary + the existing `ROOM_TARGETS`
  words (sofa, coffee table, tv, cabinet, bed, wardrobe, bedside table, lamp, dining
  table, chair, rug, shelf, desk, bookshelf …) — these seed rows land `active`.
- Editable/approvable from the admin UI. The AI may add rows, but new AI rows are
  `pending` until approved.

**`vendor_category_maps`** (raw → master):
- `id`, `vendorId`, `rawCategory` (the vendor's own string, e.g. "Bar-Stool"),
  `categoryId` (→ `categories.id`), `status` (`active` | `pending`), `source`
  (`seed` | `ai` | `manual`), timestamps.
- One row per distinct (vendor, rawCategory). AI-proposed maps are `pending`.

**Resolution:** `furnitureItems` gets `categoryId` (→ `categories.id`). At ingest, a
product's raw vendor category is resolved via `vendor_category_maps` to a master
`categoryId`. Pins are classified by the AI into master categories too, so
`pin.categoryId == furnitureItems.categoryId` and the match query is a plain equality.
`ROOM_TARGETS` (`src/server/service/vision/targets.ts`) already constrains what the AI
detects — it stays the AI-side vocabulary and must correspond to master category names.

---

## 4. What's already built (the scraper PoC)

`scripts/catalog/` — a throwaway spike that **proved scraping works**. Not production.
- Hatil adapter (Playwright, reads sitemap) and Brothers adapter (Playwright — Brothers
  turned out JS-rendered/bot-protected, so plain fetch failed; a real finding).
- Shared `lib/` (browser, image download, JSON write).
- Output: `output/<brand>/products.json` + downloaded images. **24 real products scraped**
  with clean names, real prices, images, and (after fixes) dimensions.
- Known rough edge: **category** on messy vendors (Brothers' own category pages mix
  items) — which is exactly what the controlled-vocabulary mapper (§2.2) fixes: derive
  category from the product **name/title**, not the vendor's nav.

This PoC is the seed of the real ingestion, but writes to NO database yet.

---

## 5. Implementation — phased, each phase shippable

### Phase 1 — Category system data model
- New `categories` + `vendor_category_maps` tables (§3). Add `categoryId` (→ categories)
  and `region` (`regionEnum`, default `bd`, + index) to `furnitureItems`.
- `regionEnum` in `shared.schema.ts`; `+ furniture_region_idx`. Existing rows backfill.
- Drizzle `db:push` (dev). Validations (`createInsertSchema`) for the new tables.
- Deliverable: the schema exists; no behavior yet.

### Phase 2 — Seed master categories + admin management
- Seed `categories` with the known vocabulary (§3), all `active`.
- Admin oRPC module (router+service, two-file convention) + UI to **list / add / edit /
  approve (pending→active) / deactivate** categories AND vendor→master mappings.
- Deliverable: you can manage the master list and mappings from `/admin`.

### Phase 3 — AI category mapping (precompute + review)
- A step that, for a vendor, gathers ALL distinct raw categories, asks the AI (one batch)
  to map each → an existing master category OR **propose a new one**; writes results to
  `vendor_category_maps` (and any new `categories`) as **`pending`**.
- You review/approve in the Phase-2 admin UI before ingest uses them.
- Deliverable: a reviewed raw→master mapping per vendor.

### Phase 4 — Ingestion: scraper → real DB (ONE vendor first: Hatil)
- Promote the Hatil PoC into ingestion: upsert a Hatil `vendors` row → for each scraped
  product, resolve its raw category via `vendor_category_maps` → `categoryId`, set
  `region="bd"`, `source="brand"`, keep vendor `imageUrl` (hotlink, §2.4) + `productUrl`
  (buy link) → upsert `furnitureItems` (dedupe by productUrl/slug).
- Hatil only first (cleanest data). The **thin vertical slice** of real catalog data.
- Deliverable: real Hatil products in `furnitureItems`, each with a master `categoryId`.

### Phase 5 — AI classifies pins into master categories
- Ensure the vision/tagging step labels detected furniture with a **master category**
  (via `ROOM_TARGETS` ↔ category-name correspondence; allow "other"). Touches
  `src/server/service/vision/targets.ts` / tag service / AI prompt.
- Deliverable: `pin.categoryId` is a master category — same vocabulary as the catalog.

### Phase 6 — Matching: fill the pin → show products
- In `setVisionTags` (`src/app/create/_modules/design.service.ts`, currently hardcodes
  `furnitureItemId: null`): look up `furnitureItems WHERE categoryId = pin.categoryId AND
  region = ctx.region AND isActive` → pick top few (featured/price/newest) → attach to the
  pin. The existing pin→item join (~line 93) already feeds the result UI: image
  (hotlinked), name, price, **Buy** → `productUrl`.
- Deliverable: **tap a pin → real Hatil products → Buy link.** Loop live, real data.

### Phase 7+ — Scale & harden (deferred, §2.5/§2.4)
More vendors (one adapter each) · generalized scraper→DB pipeline · sitemap-diff refresh
cron · download images to R2. Plus **security hardening**: rate-limit the token-spending
procedures (`design.generate`/`regenerate`) — cheap, protects the AI budget, do early.
Then the commercial layer (auth → credits → payments) — after the catalog is real.

---

## 6. Critical files
- `src/db/schemas/` — NEW `category.schema.ts` (`categories`, `vendor_category_maps`);
  `furniture.schema.ts` gains `categoryId` + `region`; `shared.schema.ts` gets `regionEnum`.
- `src/app/admin/…` — new category-management module (router+service, two-file) + UI
  (list/add/edit/approve/deactivate categories & mappings).
- `src/server/service/…` — AI mapping step (batch raw→master, propose new, write pending).
- `src/db/schemas/design.schema.ts` — `designTags.furnitureItemId` is the null→real bridge.
- `src/app/create/_modules/design.service.ts` — `setVisionTags` (add categoryId+region
  lookup) and the pin→furnitureItem join that feeds the UI.
- `src/server/service/vision/targets.ts` + AI/tagging prompt — classify into master cats.
- `scripts/catalog/` — seed of Phase 4 ingestion (Hatil first).

## 7. Verification
- Phase 1/2: after ingest, `furnitureItems` holds real Hatil rows with master-list
  categories + `region="bd"`; spot-check a few against live pages.
- Phase 3: generate a redesign; confirm pin categories are all master-list values.
- Phase 4 (end-to-end): run a redesign in the app → tap a pin → see real Hatil product(s)
  of the matching category → Buy link opens the vendor page. Images hotlink (some may
  break — acceptable for preview per §2.4).
- Throughout: `bun run typecheck` + Biome on changed `src/**` files only.

## 8. Explicitly out of scope here
Vector/embedding matching (rejected, §2.1) · downloading images to R2 (§2.4, later) ·
refresh cron & parallel scale-scraping (§2.5, later) · currency/payments of the two-lane
work (separate effort; only the `region` filter is in scope) · auth (comes after catalog).
