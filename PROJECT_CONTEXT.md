# PROJECT CONTEXT — AI Interior Design Platform for Bangladesh

> This file is the single source of truth for the project. Read it fully before writing code.

---

## 1. What We Are Building

An AI-powered interior design web application **built specifically for the Bangladeshi market**.

A user uploads a photo (or 360° panorama) of their room. The AI generates a redesigned version of that room in a chosen style. Furniture in the redesigned image carries **clickable tags** that link to **similar real furniture available locally in Bangladesh** — both **new** (Hatil, Otobi, Regal, Partex, Brothers, Navana, Akhtar) and **used** (Bikroy, Facebook Marketplace) — with prices in **BDT (৳)**.

### The One-Line Positioning
> **"See your room redesigned and furnish it from local shops or second-hand, in taka."**

NOT "an AI room design app for Bangladesh." The AI redesign is the **hook**. The **local sourcing marketplace is the product.**

---

## 2. Strategic Framing (IMPORTANT — read before making architectural decisions)

The AI image generation is a **commodity**. Global apps (RoomGPT, Interior AI, Decoratly, Planner 5D) already do it, and general-purpose AI will likely absorb it over time.

**The defensible moat is the LOCAL LAYER:**
- Bangla-first interface
- Local furniture catalog (new brands + used marketplace)
- BDT pricing
- bKash/Nagad payment
- Local carpenter/mistiri execution path
- Local interior firm handoff/referrals

**Therefore:** build this as a **local home-renovation marketplace that uses AI redesign as the acquisition hook**, not as an AI tool with a local coat of paint. Architectural decisions should protect and strengthen the local layer.

---

## 3. Target User

- Ordinary middle-class Bangladeshis renovating a flat (often a ready-made apartment that's been lived in for years)
- **Mostly mobile** — traffic will come from Facebook links opened on phones
- Not designers, not tech-savvy
- Many prefer **Bangla** over English
- **Price-sensitive** — money is their #1 anxiety
- Often get furniture **custom-built by a local carpenter**, not flat-pack
- Household decisions are **family decisions** — sharing to WhatsApp/Messenger matters

---

## 4. Technical Scope — WHAT IS AND ISN'T POSSIBLE

This was carefully validated. **Do not build beyond this.**

### ✅ IN SCOPE (reliably achievable with image generation)
- Upload room photo → AI-redesigned image from the **same angle**
- Upload **panorama/360 photo** → redesigned panorama the user can **pan around** (feels 3D, is NOT 3D)
- Floor plan → generated room view (*illustrative*, not dimensionally accurate)
- Re-prompt to regenerate in different styles
- **Static** clickable tags on furniture in the generated image
- Text-based design feedback/suggestions

### ❌ OUT OF SCOPE (do not attempt)
- True freely-rotatable 3D room models
- Draggable/resizable 3D furniture objects
- Accurate 3D reconstruction (NeRF/Gaussian Splatting) from casual user photos
- Generating accurate **new/unseen angles** of the user's real room (AI will invent what it can't see — unreliable)

### ⚠️ Critical Caveat on Furniture Tags
AI-generated furniture is **invented** — it does NOT correspond to a real Hatil/Otobi product. Therefore tags are **similarity matches**, not exact product links.

**Tags must be framed to the user as "find similar locally," NOT "buy this exact item."** Set expectations honestly in the UI.

Two implementation approaches:
1. **Similarity matching** — match generated furniture to visually similar items in the local catalog
2. **Curated catalog guidance** — guide the AI prompt toward furniture based on real catalog pieces so tags map more closely

---

## 5. Tech Stack (DECIDED)

### Core
- **Next.js** (App Router) + **React** + **TypeScript**
- Frontend **and** backend (API routes) in the same project

### Hosting
- **Cloudflare Pages** (chosen for MVP — free tier, developer friendly, same ecosystem as R2)
- ⚠️ See "Cloudflare Risk" below

### Database
- **PostgreSQL — Supabase Postgres ONLY** (using it purely as a Postgres host)
- **Do NOT use Supabase Auth**
- **Do NOT use Supabase Storage**
- Rationale: standard Postgres = full portability, can migrate anytime via `pg_dump`
- ⚠️ Use the **pooled connection string** (port 6543 / "transaction" pooler) for app runtime on serverless. Direct connection only for migrations.

### ORM
- **Drizzle** (chosen over Prisma — lighter, SQL-like, great TypeScript)

### Auth
- **Better Auth** (chosen over Supabase Auth / NextAuth)
- Rationale: no platform lock-in, more built-in (2FA, password reset, sessions), TypeScript-first, works with Drizzle adapter
- Store auth tables in the same Supabase Postgres via Drizzle
- **Social logins: Facebook (highest priority for BD audience) + Google**, plus email/password
- **Authorization is enforced in application code** — NOT via Supabase RLS (we're not using Supabase Auth)

### Image Storage
- **Cloudflare R2**
- Rationale: **$0 egress** — critical because this is an image-heavy app where the same image is viewed many times. S3/Supabase charge ~$0.09/GB egress; R2 charges nothing.
- Access via `@aws-sdk/client-s3` (R2 is S3-compatible) + `@aws-sdk/s3-request-presigner`

### CDN
- **Cloudflare** (set long cache headers on images to minimize read operations)

### AI Image Generation
- **Provider/aggregator: Fal.ai or Replicate** — NEVER integrate a model directly. One API key, swap models by changing one line.
- **Model tiers:**
  - Cheap/testing: **Z-Image Turbo** (~$0.01) or **Flux Schnell** (~$0.003–0.01)
  - **Default/production: Seedream 4.5** (~$0.026–0.04) — best quality-per-dollar for interiors
  - Premium tier: **Nano Banana Pro** (~$0.06) — best editing precision & photorealism
  - **Google AI Studio** (Imagen/Nano Banana) — has a **daily renewing free quota**; use for testing and early free-tier usage
- **This must be image-to-image (img2img)**, not text-to-image — we transform the user's actual room
- **Call from the backend only** (API route). Never expose the API key to the client.

### Payments
- **SSLCommerz** — aggregates bKash + Nagad + cards + bank in one integration
- Do NOT use Stripe as primary (most BD users lack credit cards)

### Analytics
- **PostHog Cloud** (free tier, no self-hosting needed) — `posthog-js` + `posthog-node`
- **PLUS custom event logging into Postgres via Drizzle** — CRITICAL: these numbers are what we sell to vendors later. Instrument from day one.

### Email (production)
- **Resend** — for password reset / verification emails from our domain

### UI
- **Tailwind CSS**
- **shadcn/ui** (Radix-based)
- **lucide-react** (icons)

### Other Packages
- `react-hook-form` + `zod` — forms & validation (validate API inputs too)
- `@tanstack/react-query` — client data fetching/caching
- `browser-image-compression` — compress user uploads before sending (saves cost/bandwidth)
- `next/image` — optimized display
- `date-fns`, `nanoid`
- ESLint + Prettier

---

## 6. ⚠️ Cloudflare Pages Risk — VALIDATE EARLY

Cloudflare runs Next.js on **Workers, not Node.js**. Some Node-dependent packages don't run, and there are CPU-time limits.

**Before building far, spin up a throwaway Cloudflare Pages deploy and verify these 4 things work:**
1. A Fal/Replicate image generation call from an API route (**AI generation takes 10–30s — this is the biggest risk**)
2. Drizzle + Supabase Postgres connection
3. Better Auth session handling
4. A webhook endpoint (for SSLCommerz)

**If the AI call times out:** use an **async/queued pattern** — kick off generation, return immediately, poll for the result (Fal supports queued jobs). Better UX anyway (progress state instead of hung request).

**Fallback host if Cloudflare fights us:** **Railway** (container-based, no serverless limits, predictable usage pricing, ~$5/mo hobby). Migration is a config change, not a rewrite — storage (R2), DB (Supabase Postgres), and auth (Better Auth) are all host-independent by design.

**Endgame at scale:** self-host with **Coolify on a Hetzner/DigitalOcean VPS** (~10–20% of managed cost).

---

## 7. Core User Flow (MVP)

```
Landing → Upload room photo (or panorama)
       → Select room type + style (+ optional free-text prompt)
       → Generating (10–30s, friendly loading state)
       → Result: redesigned image + clickable furniture tags
       → Tag click: product detail (image, dimensions, BDT price, Buy New / Buy Used links)
       → Regenerate / Try another style / Save / Share (WhatsApp, Messenger)
```

### Screens Needed
1. **Landing** — hero ("See your room redesigned before you spend a taka"), before/after examples, 3-step how-it-works, upload CTA
2. **Upload** — photo upload (drag/drop + camera), panorama option, room type selector
3. **Style selection** — visual grid of styles + optional free-text prompt + budget hint (low/medium/premium)
4. **Generating/loading** — friendly wait state
5. **Result** — large redesigned image, clickable furniture pins, regenerate/style/save/share buttons, remaining free credits
6. **Furniture tag detail** — sheet/panel: product image, name, dimensions, BDT price, "Buy new" (brand link) + "Buy used" (Bikroy link)
7. **Saved designs gallery**
8. **Auth** — login/signup, Facebook + Google prominent, plus email/password
9. **Pricing/credits** — free tier vs paid, bKash + Nagad shown clearly

---

## 8. Design Direction

- **Mobile-first** (Facebook links → phone browsers)
- **Bangla-first** with English toggle
- Clean, simple, **trustworthy** — not flashy. Users are not tech-savvy.
- **Warm, homey** feel — this is about their home, not a tech dashboard
- Prices in **BDT (৳)**
- **Web app, not native** — no install friction; captures Facebook link-sharing instantly

---

## 9. Cost Control (BUILD THESE IN FROM DAY ONE)

Costs are **usage-based**, not fixed — they only grow when users grow. But enforce discipline:

1. **Cap free generations per user** (e.g. 3–5 free, then sign-in or pay). This is the single most important cost control.
2. **Do NOT store every generation forever.** Store only **saved** designs. Auto-expire unsaved renders (7–30 days). Let free users download rather than storing server-side indefinitely.
3. **Cache aggressively** — never regenerate identical requests.
4. **High-res output = paid tier only.**
5. **Set spending limits/alerts** on the AI provider dashboard immediately.
6. **Compress uploads client-side** before sending.

**Rough cost reality:** ~$0.01–0.03 per generated image. 1,000 user sessions × 4 images ≈ $40–120. Infrastructure (Cloudflare Pages + R2 + Supabase free tier) ≈ **$0** at MVP scale.

---

## 10. Revenue Model (build hooks for these; don't implement all now)

**Key insight: Users are the inventory. Businesses are the customers.**
Consumers are price-sensitive and won't pay much. Keep consumer pricing low/free to build the user base, then monetize the **supply side**.

**Phase 1 (MVP):** Free with usage caps + cheap credit packs (bKash/Nagad). Goal is *users and proof of demand*, not revenue.

**Phase 2 (real money starts):** Furniture vendors —
- **Featured placement / listing fee** (fixed monthly — easier to close first)
- **Affiliate commission** per referred sale (needs click tracking → build tracking NOW)

**Phase 3 (biggest, most reliable):** B2B —
- Interior firm **referral fees** ("get it built" handoff)
- **SaaS licensing** of the tool to interior firms (they use it with their own clients)
- Lead-gen to adjacent brands (paint: Berger/Asian Paints; tiles, sanitary, lighting)

**⚠️ CRITICAL IMPLEMENTATION NOTE:** To close vendor deals we must **show numbers**. Instrument event tracking from day one: redesigns generated, styles chosen, **furniture links clicked**, conversions. These metrics ARE the future sales pitch.

---

## 11. Validation Test (DO THIS BEFORE HEAVY CODING)

**Do not write serious code until this is verified with your own eyes:**

1. Take a **real photo of an actual Bangladeshi room**
2. Take a **phone panorama** of one
3. Run both through **Seedream 4.5** and **Nano Banana** on Fal/Replicate with a redesign prompt
4. Also test a **floor plan → room view**
5. **Look at the output.** Does the quality clear the bar?

This costs ~$0 (free tiers) and takes an afternoon. It removes all guesswork about whether the core value prop actually works.

---

## 12. Prompt Engineering Note

The API call is trivial. **The hard/valuable part is the PROMPT** — crafting text that makes output look good AND authentically **Bangladeshi** (not generic Scandinavian/Japandi, which is what global models default to).

This is trial-and-error, not coding. It's also **part of the differentiation** — a redesign that looks *right* for a Dhaka flat is something global apps can't produce.

Consider: reference images of real Bangladeshi interiors to guide/fine-tune the model. Design for large-family dining, prayer space, verandas/balconies, local proportions.

**Keep prompts server-side and private** — they're a trade secret.

---

## 13. IP / Defensibility Note

The idea is **not legally protectable** and **will be copied**. Do not build strategy around secrecy.

**What actually protects us:**
- Local vendor/carpenter relationships (hard to clone)
- Being first + user base
- Accumulated data (what people click, local style preferences)
- Speed of iteration
- Brand trust

**Cheap protections to secure:** brand name trademark (BD), domains, social handles. Keep prompts/matching logic private. **Do NOT pursue patents** — slow, expensive, unenforceable at this stage.

---

## 14. Database Schema — Core Tables (get this right; it's the marketplace backbone)

Design carefully — this is the actual business, not the AI plumbing.

- `users` (Better Auth managed)
- `sessions` / `accounts` (Better Auth managed)
- `designs` — user_id, original_image_url (R2), generated_image_url (R2), style, prompt, room_type, is_saved, created_at, expires_at
- `furniture_items` — name, brand (Hatil/Otobi/etc), category, dimensions, price_bdt, image_url, product_url, condition (new/used), source (brand/bikroy/fb_marketplace)
- `vendors` — name, type (brand/used_seller/carpenter/interior_firm), contact, is_verified, commission_rate
- `design_tags` — design_id, furniture_item_id, x_coord, y_coord (pin position on generated image)
- `events` — user_id, event_type (generation, tag_click, buy_click, share, save), metadata, created_at ← **THE VENDOR SALES PITCH**
- `credits` / `subscriptions` — user_id, free_used, paid_credits, plan

---

## 15. Build Priority

**Ship the smallest thing that proves the LOCAL LAYER matters — not the prettiest AI demo.**

1. Validate AI output quality on real BD rooms (Section 11)
2. Validate Cloudflare Pages compatibility (Section 6)
3. Scaffold: Next.js + TS + Tailwind + shadcn + Drizzle + Better Auth
4. Core flow: upload → style → generate → result
5. R2 storage + credit caps
6. Furniture tagging + local catalog (even a small hand-curated one to start)
7. Event tracking (for the vendor pitch)
8. Bangla UI
9. bKash/Nagad via SSLCommerz
10. **Then:** get ONE furniture vendor or ONE interior firm to say yes to a deal. *That* validates the business — more than a thousand free users do.
