# AI Image Model — Pricing & Quality Research

**Researched:** July 2026 · **Use case:** img2img interior redesign (restyle a room photo while
doors/windows/walls stay put).

Every price below is **reconciled against the vendor's own published per-image price** — not
derived from token rates. That distinction matters: see [Pricing pitfalls](#pricing-pitfalls).

---

## TL;DR

- **Current model:** Nano Banana 2 Lite (`google/gemini-3.1-flash-lite-image`) — $0.0336/img,
  Elo 1191 (rank #18 of 66 on editing).
- **Only model that is both BETTER and CHEAPER:** **grok-imagine-image** — Elo 1213 (+22),
  $0.022/img (−35%), **2K output at the same price**. Available on **Fal or xAI direct only**
  (not on OpenRouter).
- Everything cheaper than Lite is **worse**. Everything better (besides grok-imagine) is
  **more expensive**. There is no other free lunch.
- **Caveat that undercuts all of it:** the Elo ranks human *preference*, NOT structure
  preservation. It cannot prove a model keeps doors/windows in place. **A real visual test on a
  real room photo is still required.**

---

## Verified pricing & quality (@1024px)

Elo = Artificial Analysis blind image-**editing** arena (humans compare edits of the same source
image + same instruction). "/mo" assumes **100 images/day**.

| Elo | Model | $/img | /mo @100/day | vs current | Best provider |
|-----|-------|-------|--------------|-----------|---------------|
| 1256 | GPT Image 2 (high) | $0.1352 | $406 | +302% | OpenRouter |
| 1254 | GPT Image 1.5 (high) | $0.1428 | $428 | +325% | Fal |
| 1247 | Nano Banana 2 | $0.0672 | $202 | +100% | OpenRouter |
| 1244 | MAI-Image-2.5 | $0.0500 | $150 | +49% | either |
| 1241 | Nano Banana Pro | $0.1344 | $403 | +300% | OpenRouter |
| 1230 | grok-imagine **quality** | $0.0600 | $180 | +79% | either |
| **1213** | **grok-imagine-image** ⭐ | **$0.0220** | **$66** | **−35%** | **Fal / xAI only** |
| 1205 | FLUX.2 [max] | $0.0700 | $210 | +108% | OpenRouter |
| **1191** | **Nano Banana 2 Lite** ← current | **$0.0336** | **$101** | — | OpenRouter |
| 1173 | FLUX.2 [pro] | $0.0300 | $90 | −11% | OpenRouter (worse quality) |
| 1162 | FLUX.2 [klein] 9B | $0.0220 | $66 | −35% | Fal (worse quality) |
| 1149 | FLUX.2 [dev] Turbo | $0.0160 | $48 | −52% | Fal (worse quality) |
| 1137 | FLUX.2 [dev] Flash | $0.0100 | $30 | −70% | Fal (worse quality) |
| 1113 | FLUX.2 klein 4B | $0.0038 | $11 | −89% | **tested — quality rejected** |

Full leaderboard is 66 models: <https://artificialanalysis.ai/image/leaderboard/editing>

### Images per budget

| Model | $50/mo | $100/mo | $200/mo | $500/mo |
|-------|--------|---------|---------|---------|
| **grok-imagine** | **76/day** | **152/day** | **303/day** | **758/day** |
| Nano Banana 2 Lite (current) | 50/day | 99/day | 198/day | 496/day |
| Nano Banana 2 | 25/day | 50/day | 99/day | 248/day |
| Nano Banana Pro | 12/day | 25/day | 50/day | 124/day |

**At the same $100/mo, grok-imagine gives 53% more images AND higher quality.**

---

## Provider comparison — same model, different price

Fal and OpenRouter both resell; margins differ **per model**, so neither is universally cheaper.

| Model | OpenRouter | Fal | Winner |
|-------|-----------|-----|--------|
| Nano Banana 2 Lite | **$0.0336** | $0.0424 | OpenRouter (−21%) |
| Nano Banana 2 | **$0.0672** | $0.0800 | OpenRouter (−16%) |
| Nano Banana Pro | **$0.1344** | $0.1500 | OpenRouter (−10%) |
| FLUX.2 [max] | **$0.0700** | $0.1400 | OpenRouter (−50%) |
| FLUX.2 [pro] | **$0.0300** | $0.0450 | OpenRouter (−33%) |
| MAI-Image-2.5 | $0.0500 | $0.0500 | tie |
| grok-imagine **quality** | $0.0600 | $0.0600 | tie |
| **grok-imagine-image** | **not available** | **$0.0220** | **Fal only** |
| GPT Image 1.5 | not available | $0.1430 | Fal only |

**Rule of thumb:** OpenRouter for Google/FLUX models; Fal only for what OpenRouter lacks
(grok-imagine, GPT Image 1.5).

---

## Cost levers (bigger wins than switching model)

| Lever | Saving | Catch |
|-------|--------|-------|
| **Batch mode** (Google) | **50%** → $51/mo | Async — doesn't fit a "user waits" UX |
| **768px instead of 1024px** | **~43%** → $58/mo | Cost scales with pixels² |
| **Tiered models** (cheap for free users, good for paying) | most of it | Needs credit enforcement |
| grok-imagine 2K output | **free** | 2K costs the same as 1K ($0.02) |

Google's Lite is **locked to 1024px** ("Output images are generated at a fixed 1K"), so the
resolution lever doesn't apply to it — but grok gives 2K at no extra cost.

### Break-even (Lite @ $0.0336/img)

| Revenue per design | Margin | Profit @ 100/day |
|--------------------|--------|------------------|
| $0.05 | 32% | +$48/mo |
| $0.10 | 66% | +$198/mo |
| $0.25 | 86% | +$648/mo |

---

## Cloudflare (current free tier)

| Model | $/img | Free/day | Speed | Verdict |
|-------|-------|----------|-------|---------|
| **flux-2-klein-4b** ← current | ~$0.0012 | **~91** | ~13s | Quality rejected (Elo 1113, rank #47) |
| flux-2-dev | ~$0.031 | **~3** | **65–75s** | Tested: works, 1024px input OK, but 25× costlier and 5× slower |

Cloudflare bills in **Neurons** (10,000 free/day). Real usage is only readable from the GraphQL
analytics API (`aiInferenceAdaptiveGroups` → `sum.totalNeurons`), not per-call.

`flux-2-dev` accepts **1024px input** (klein is capped at 504px) — better quality, but ~3 free
images/day makes it unusable as a free tier.

> ⚠️ **The free quota is a ROLLING 24-HOUR window, not a UTC-midnight reset.** Querying usage for
> "today (UTC)" can show `0 / 10,000` while the API still returns HTTP 429, because spend from
> yesterday evening still counts. Always query the last 24 hours. (Our admin quota card queries
> "today" — it will under-report.)

---

## Furniture pins — moondream (LIVE TESTED ✅)

`@cf/moondream/moondream3.1-9B-A2B` — Cloudflare's vision model. **Replaces the deleted Python
YOLO+SAM service**: hosted, no GPU, near-free, and it found items YOLO missed.

**Measured on a real generated room (2026-07-16):**

| Metric | Value |
|--------|-------|
| Tokens per call | **736 in / 7 out** (measured) |
| **Neurons per call** | **20.7 N** = **$0.00023** |
| Latency | **~2.4 s** |
| Output | native `objects[]` — real bounding boxes, normalized 0–1 |

### It only works ONE WAY

`detect` runs moondream's **vision grounding head** (measures pixels). `query` runs the **language
model** (describes, hallucinates). Everything except one-word `detect` was tested and failed:

| Attempt | Result |
|---------|--------|
| ✅ `task:"detect"`, `target:"sofa"` | **accurate boxes** — the only thing that works |
| ❌ `target:"sofa, dining table, tv"` | 1 object — matches the FIRST word only |
| ❌ `target:"sofa. chair. table."` | 1 object — same |
| ❌ `target:"furniture"` (generic) | only 3 objects, no labels |
| ❌ `task:"query"` "list all furniture + coords" | **hallucinated** — copied the example coords from the prompt, then emitted `x:100,y:100` for everything else, invented a non-existent rug |

**Rule: detection heads measure, language models hallucinate.** There is no one-call shortcut —
you pay **one call per furniture type**.

### Accuracy vs the old Python engine (same image)

| Item | moondream | Python YOLO+SAM |
|------|-----------|-----------------|
| tv | (63.7%, 25.6%) ✅ | (68%, 26%) ✅ |
| lamp | (48.0%, 29.1%) ✅ | (48%, 30%) ✅ |
| sofa | (79.7%, 85.1%) ✅ | (74%, 91%) ✅ |
| dining table | (45.1%, 78.5%) ✅ | ❌ **missed** |
| cabinet | (68.8%, 66.8%) ✅ | ❌ **missed** |

### Cost — klein-4b (110 N) + moondream

| Targets | N/design | Free/day | $/design | /mo @100/day |
|---------|----------|----------|----------|--------------|
| 1 | 131 | 77 | $0.0014 | $4.31 |
| 3 | 172 | 58 | $0.0019 | $5.68 |
| **4** ⭐ | **193** | **52** | **$0.0021** | **$6.36** |
| 7 | 255 | 39 | $0.0028 | $8.41 |
| 10 | 317 | 32 | $0.0035 | $10.46 |

Each extra furniture type = **+20.7 N ≈ +$0.0002**. Linear and predictable.

**Strategic point:** moondream is cheap enough (~$0.0002/target) to bolt onto **any** generator —
so image quality and pin capability are now **independent decisions**. Notably this rescues
grok-imagine (Elo 1213, $0.022, image-only output): grok + moondream = better images AND pins.

### Which models can return coordinates natively (no moondream needed)

| Family | Output modalities | Coords in one call? |
|--------|-------------------|---------------------|
| Google Gemini / Nano Banana | `['image','text']` | ✅ yes |
| FLUX (Cloudflare/OpenRouter) | `['image']` | ❌ no |
| GPT Image | `['image']` | ❌ no |
| grok-imagine | `['image']` | ❌ no |

---

## Pricing pitfalls

Four wrong conclusions were reached during this research by deriving prices from token rates.
**Always reconcile against the vendor's published per-image price.**

1. **Token counts differ per vendor family.** There is no universal "tokens per image":
   | Family | Tokens per 1024px image |
   |--------|------------------------|
   | Google / GPT | **1120** |
   | FLUX | **4096** |
   | grok | **~4175** |
   | MAI | **~1064** |

   Assuming 1120 for everything under-priced grok-quality by 4.5× and FLUX.2 max by 3.7×.

2. **OpenRouter's `image_output` is sometimes a back-computed per-image price.** e.g. FLUX.2 pro's
   `0.00000732421875` × 4096 = exactly $0.03 (its real per-image price). Odd repeating decimals
   are the tell.

3. **"Per image" headline prices on Fal are often per-megapixel** — img2img bills **input AND
   output**, so a "$0.005" model really costs $0.010 for a 1MP→1MP edit.

4. **Quality tiers hide cost.** GPT Image 1.5's #2 Elo rank is measured at `high` quality
   ($0.143/img), not at its cheapest tier ($0.018). Always check which tier the benchmark used.

---

## Rejected options

| Option | Why rejected |
|--------|-------------|
| **DaVinci.ai** | **No public API** (all developer endpoints 404). Consumer web/mobile app only. Its $0.010–0.016/img pricing assumes humans under-use quotas; automating it would breach ToS. |
| **Self-hosted GPU** (cloud, ~$250–400/mo) | Nano Banana is **closed-weights — cannot be self-hosted at any price**. A GPU only runs open models (FLUX/SDXL), which were already rejected on quality. $3k of hardware ≈ 7 months of Nano Banana Pro and still can't match it. |
| **Buy a PC + colocate** (~$3,000 + $50–150/mo) | Same closed-weights problem. Breaks even vs cloud GPU in ~12 months, but solves a scaling problem that doesn't exist yet (zero users). Revisit only when the API bill exceeds ~$200/mo. |
| **Fal for Nano Banana** | 26% markup vs OpenRouter/Google direct. |
| **Google Direct (standard)** | Same price as OpenRouter ($0.0336) with no markup either way — no reason to build a second provider. |

---

## Open questions

- **Does grok-imagine actually preserve doors/windows?** Elo measures preference, not geometry.
  Test at <https://fal.ai/models/xai/grok-imagine-image/edit> with a real room photo + the
  preservation prompt from `src/server/service/ai/prompt.ts`. Judge structure first, aesthetics
  second.
- **Unpriced models above Lite:** HunyuanImage 3.0 Instruct (Elo 1225), HiDream-O1-Image (1204) —
  both on Fal, pricing not published in their API.
- **Independent structure-preservation benchmarks** (GEdit-Bench / ImgEdit background-preservation
  subscores) were not obtained. One weak signal: third-party tests found FLUX.2 Pro/Max *failed*
  to maintain recognizable features while Nano Banana models preserved identity — FLUX's edge is
  stylistic ("cinematic, painterly"), not structural.
- **Seedream 5.0 Pro Edit** markets "region-precise editing, keeps rest of frame intact" — this
  is **unverified**; it doesn't appear on the editing leaderboard at all.

---

## Sources

- Artificial Analysis image-editing arena (Elo, blind pairwise human votes) —
  <https://artificialanalysis.ai/image/leaderboard/editing>
- Google Gemini API pricing — <https://ai.google.dev/gemini-api/docs/pricing>
  (states verbatim: 1120 tokens per 1K image = $0.0336/image)
- OpenAI image pricing (gpt-image-1.5: image out $32/1M tokens; gpt-image-2: $30/1M)
- xAI Imagine API pricing (grok-imagine-image: $0.002 media input + $0.02 output at **1K and 2K**)
- Fal model catalog API — `https://fal.ai/api/models?keywords=<term>` (`pricingInfoOverride` field)
- OpenRouter models API — `https://openrouter.ai/api/v1/models?output_modalities=image`

**Elo reliability caveat:** voting leaderboards are vulnerable to poisoned votes (~10% adversarial
votes can shift a rank by up to 5 places) and matchup-imbalance bias. Treat small Elo gaps
(<20 points) as noise.
