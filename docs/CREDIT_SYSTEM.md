# Credit System — Design

> Status: **design (not yet built)**. This is the plan for Home AI's monetization core — the
> abstract-credit ledger that both SSLCommerz (BD) and Stripe (later) feed into.
> Decided: **credit system is built FIRST**, payment gateways plug in afterward.

## 1. Why credits (the problem this solves)

The AI redesign is the acquisition hook; we charge for it via **credits**. Model costs today
are tiny (Cloudflare ~$0.005/render, OpenRouter ~$0.01) but **will grow 10–20×** as we add
more powerful models. The credit design must let us add a 20×-more-expensive model **without
repricing existing packs, touching user balances, or confusing users**.

Every major player solves this the same way (see §9): **one abstract credit currency, where
each action/model costs a variable number of credits.** We adopt exactly this.

## 2. Core principle — abstract credits, variable cost per model

**1 credit = a small fixed unit of value. It is NOT "1 image".**

Each model costs a configurable number of credits:

- cheap model → **1 credit**
- premium model → **10 credits**
- a future 20×-model → **20 credits**

A user's balance is abstract credits. **Gateways add credits; models subtract them.** To add a
pricier model later, you add ONE line to a config table — packs, prices and balances are
untouched. This is the whole point.

```ts
// src/config/credits.ts — the ONLY place a model's cost AND tier lives.
// (Full shape incl. `tier` is used by the security gate in §5b.)
export const MODELS = {
  // FREE tier — 1 credit (caps free usage; ~$0 to us via 10k free neurons/day).
  "cf-flux-klein":     { cost: 1,  tier: "free" },     // Cloudflare FLUX.2 klein
  // PREMIUM tier — runs on PAID credits.
  "gemini-nano-banana":{ cost: 6,  tier: "paid" },     // Google — CHOSEN premium (~$0.039/img)
  // FLAGSHIP tier — future, PAID credits.
  "gpt-image-1":       { cost: 18, tier: "paid" },     // OpenAI (~$0.167/img)
  "gpt-image-2":       { cost: 22, tier: "paid" },     // OpenAI (~$0.21/img)
  // add future models here — costs from §3; NOTHING else changes.
} as const;
export const DEFAULT_MODEL = "cf-flux-klein"; // safe default for free/anon users
export const CREDIT_PRICE_BDT = 2;            // 1 credit = ৳2 (§3); open top-up rate + pack anchor
```

Cost multipliers are seeded from our **real logged cost data**: `generation_logs.neurons`
(Cloudflare `cf-ai-neurons` header) and `generation_logs.cost_usd` (OpenRouter) already record
actual per-render cost, so multipliers are calibrated, not guessed.

## 3. Economics — models by tier, cost, and margin

All figures are **real**: Cloudflare cost from our measured `generation_logs` (119 neurons/render
× $0.011/1000); premium/flagship $/image from provider pricing research (mid-2026, §9). Assume
**৳120 = $1** and **1 credit = ৳0.50 = $0.0042** (the tunable anchor).

Credit costs per render are set for a **tight free tier and a wide free→premium gap** (free
usage is a taste, not a product): free = 2 credits, premium = 40, flagship = 150.

**Cloudflare gives 10,000 free neurons/day** → at 119 neurons/render, the first **~84
renders/day (~2,520/month) cost us $0**. Overflow is ~$0.0013/render. So the FREE tier is a
near-zero-cost acquisition funnel, not a loss-leader.

**Every render costs credits — including free-tier ones.** This is what caps free usage: a free
user can't generate unlimited images. The free model costs **2 credits**; the **10-credit anon
grant (§5) = ~5 free renders**. Deliberately tight — free is a taste of the product.

| Model | Provider | Tier | Runs on | Our $/img | Our ৳ | Credits/img | We charge ৳/$ | Profit/img | Margin |
|---|---|---|---|---|---|---|---|---|---|
| **FLUX.2 klein-4b** | Cloudflare | **FREE** | free credits | **$0.00**¹ | ৳0.00 | **2** | ৳1 / $0.008 | ৳1.00 | ~100%³ |
| FLUX.2 klein | OpenRouter | FREE | free credits | $0.016 | ৳1.92 | 2 | ৳1 / $0.008 | −৳0.92 | fallback² |
| **Gemini Nano Banana** ⭐ | Google | **PREMIUM** | paid credits | $0.039 | ৳4.68 | **40** | ৳20 / $0.17 | ৳15.32 | **77%** |
| Seedream v4 | fal.ai | PREMIUM | paid credits | $0.030 | ৳3.60 | 32 | ৳16 / $0.13 | ৳12.40 | 78% |
| FLUX 1.1 pro | fal.ai | PREMIUM | paid credits | $0.040 | ৳4.80 | 40 | ৳20 / $0.17 | ৳15.20 | 76% |
| gpt-image-1 high | OpenAI | **FLAGSHIP** | paid credits | $0.167 | ৳20.04 | 150 | ৳75 / $0.63 | ৳54.96 | 73% |
| GPT Image 2 high | OpenAI | FLAGSHIP | paid credits | $0.210 | ৳25.20 | 190 | ৳95 / $0.79 | ৳69.80 | 73% |

¹ within the free 10k neurons/day; ~$0.0013 on overflow. ² OpenRouter is only a fallback when
Cloudflare is unavailable — real $ but rare. ³ "profit" on free-model renders paid with *free*
credits is notional (we granted those) — the 2-credit cost exists to **cap free usage**, not to
earn.

**Selected models:** FREE → Cloudflare FLUX.2 klein. PREMIUM → **Gemini Nano Banana** (best
img2img quality-per-$ for room redesign). FLAGSHIP → gpt-image-1 / GPT Image 2 (the future "20×"
tier). Credit costs (6 / 18 / 22) are set to hold **>40% margin at every tier** — and because
credits scale with model cost, **adding a pricier model never changes packs or prices** (§2).

## 4. How users buy credits — packs AND open top-up

Two co-equal paths, both feeding the same `CreditService.grant(...)` (pack vs open-amount is a
UI/pricing detail; the ledger only sees a `purchase`). All prices carry a **>40% margin** even
if the buyer spends entirely on the premium model.

### 4a. Fixed packs — THREE tiers + Enterprise
"Just pick one." Only three concrete packs (the open top-up below covers any other amount, so a
long list is redundant). Per-credit price drops as the pack grows (bulk reward), never below cost.
Premium model = 40 credits/img.

| Pack | ৳ BDT | $ USD | Credits | ৳/credit | ~Premium imgs | Margin |
|---|---|---|---|---|---|---|
| Starter | ৳300 | $2.50 | 700 | ৳0.43 | ~17 | 73% |
| **Popular** ⭐ | ৳500 | $4.17 | 1200 | ৳0.42 | ~30 | 72% |
| Pro | ৳1000 | $8.33 | 2600 | ৳0.38 | ~65 | 70% |
| **Enterprise** | custom | — | — | — | high volume | "Contact us" CTA (or large open top-up) |

"~Premium imgs" assumes the premium model (40 cr). On flagship (150 cr) a pack yields fewer
images but the **same margin %** — credits scale with model cost. Enterprise is a 4th pricing-page
card with a contact CTA, not a fixed price.

### 4b. Open top-up ("prepaid bridge card" — enter any amount)
The customer **enters any amount from $5 (≈৳600) upward** — $5, $7, $10, $20, $50, $100,
whatever — and gets credits at a **flat ৳2/credit ($0.0167)**. Exactly how Leonardo/OpenAI/
Anthropic sell PAYG credits. This is a **first-class purchase path**, not a fallback.

| Enter | Credits | ~Premium imgs |
|---|---|---|
| $5 (৳600) — **minimum** | 300 | ~50 |
| $7 (৳840) | 420 | ~70 |
| $10 (৳1,200) | 600 | ~100 |
| $20 (৳2,400) | 1,200 | ~200 |
| $50 (৳6,000) | 3,000 | ~500 |
| $100 (৳12,000) | 6,000 | ~1,000 |

- **Flat rate:** `credits = floor(amountBdt / RATE)`, `RATE = ৳2`. Margin is identical to the
  Starter pack (60%+) at every amount.
- **Deliberately the flat ৳2 rate** (= Starter, worse than bulk packs) so the curated packs stay
  the better per-credit deal and open top-up is the flexible "any amount" option.
- **Min = $5 (৳600)** — below this, bKash/Nagad/card gateway fees eat the margin. **Max** (e.g.
  $500) as a fraud ceiling.
- Optional later: a small volume-bonus curve above some threshold (e.g. +5% over $50) so large
  top-ups still feel rewarded without undercutting packs — deferred; flat for v1.

Both packs and open top-up credits are **`paid` credits** (§5) — they unlock premium/flagship
models and never expire (§6).

## 5. Free tier — unified credits (replaces the "5 free generations" cap)

There is **no separate free-generation counter**. Credits are the SINGLE currency for everyone;
"free" just means credits we grant at no charge. Every generation debits credits; a balance
below the model's cost blocks it. This replaces the old `free-cap.guard.ts` counting mechanism
(the burst/global abuse guards stay).

Credits flow IN from three sources, OUT via generation — all one balance, one ledger. **All
grants/purchases REPLACE the balance (SET), never sum** — this is the deliberate policy (see the
box below):

1. **Anonymous grant** — **10 `free` credits** on first visit → ~5 free renders (free model = 2
   credits). Tight on purpose.
   - **Anti-abuse (hardened):** keyed to the **composite identity — anonymousId OR IP OR
     fingerprint** — the exact pattern `free-cap.guard.ts` already uses. Clearing cookies /
     incognito does NOT re-grant (IP+fingerprint match blocks a second grant). Trade-off: shared
     IPs (offices, BD mobile networks) may under-grant; fingerprint disambiguates most cases.
2. **Signup opening grant** — **SET balance to 70 `free` credits** at account creation (~35 free
   renders), via the claim-on-signup hook (`auth.ts`). **Once per account, ever.** It **REPLACES**
   the leftover anon balance (not summed) — so "farm anon → sign up to stack" gains nothing.
3. **Purchase** — pack / open-top-up (§4). **SET balance to the purchased `paid` amount** — this
   **REPLACES everything, including leftover paid credits** (see box).

> **⚠ Policy: purchases and signup REPLACE the balance, they do not add.** This is intentional
> per product decision, but it means a user who tops up before finishing prior credits **loses
> the leftover** — including credits they paid real money for. To keep this honest and safe:
> - The wiped amount is written as an explicit **`expire` ledger row** (negative delta) — full
>   audit trail for any dispute.
> - It's a config flag: **`RESET_BALANCE_ON_PURCHASE = true`** — flip to `false` later (→ sum)
>   with zero code change if complaint/chargeback rates rise.
> - The checkout UI **MUST warn** before purchase when a meaningful balance exists ("You have N
>   credits left — buying replaces them. Use them first?"). [Phase 2 / checkout UI.]

### Free vs paid credits — TWO KINDS (this is what prevents the quality/cost conflict)

Not all credits are equal. Every credit has a **kind**:

- **`free` credits** — from anon grant + signup opening grant. **Spendable ONLY on free-tier
  models.**
- **`paid` credits** — from purchases. Spendable on **any** model, incl. premium.

**Why:** premium models are both *better* and pricier. If free credits could buy premium, the
grant → ~1 premium image, which feels broken. Instead, **free credits only run the standard/free
model; premium is unlocked by PAID credits.** This is Firefly's / Canva's model (§9). Messaging:
- Free user: *"70 free credits → ~35 redesigns on our standard AI."*
- Paid user: *"Buy credits to unlock premium AI — sharper, more realistic."*

**Spend rule:** a **free-tier** model spends **`free` credits** (falls back to paid only if free
is empty and the user has paid). A **premium/flagship** model spends **`paid` credits only** —
and is not offered to a user with zero paid credits. (Because purchases REPLACE the balance,
free and paid rarely coexist — but the kind check still governs which models are reachable.)

Example: anon granted 10 `free` → uses ~2 renders (~4 credits) → ~6 left → signs up → **SET to 70
`free`** (replaces the 6) → buys ৳500 pack → **SET to 1200 `paid`** (the leftover free is wiped +
logged as an `expire` row). Now premium renders (40 cr) draw from the 1200 paid.

Blocked at zero: the UI prompts login (if anon) or purchase (if logged-in) — never a hard dead
end while paths to more credits exist.

## 5b. Model tiers — free vs paid — and the hard security gate

**Product rule:** free users get the cheap/free models; paying users (spending credits) get the
**more powerful models**, which cost us 10–20× more. Higher credit spend covers the higher cost,
so this pays for itself — but ONLY if access is enforced correctly. If premium models are merely
"selectable," a premium generation could fire with no credits behind it, and every such call
burns real money (~$0.10–0.20). That makes tier enforcement a **security requirement**, not a
UI nicety.

Add a tier to each model in config:

```ts
// src/config/credits.ts
export const MODELS = {
  "flux-klein":   { cost: 1,  tier: "free" },    // free users may use
  "gemini-flash": { cost: 2,  tier: "free" },
  "premium-x":    { cost: 10, tier: "paid" },    // requires paid eligibility + credits
  "ultra-y":      { cost: 20, tier: "paid" },
} as const;
```

### The gate (server-side, MANDATORY, in this exact order)

Before ANY generation, the `generate` handler must, **on the server** (never trust the client's
model choice — an attacker can call the API directly with `model: "ultra-y"`):

1. **Resolve the model server-side.** Free/anon users are pinned to a free-tier model regardless
   of what the request asks for. A request for a `paid`-tier model from a non-paid user is
   **rejected**, not silently downgraded-and-charged.
2. **Tier check.** `paid`-tier model → user must have sufficient **`paid` credits** (§5: premium
   spends paid credits ONLY). Fail → `FORBIDDEN`/`PAYMENT_REQUIRED`, no AI call.
3. **Balance check + atomic reserve/debit — respecting credit kind.** `reserve(userId, modelId)`
   looks up cost + tier, then debits the correct bucket: free-tier model → **free credits first,
   then paid**; premium model → **paid credits only**. Verifies the right bucket has enough, and
   writes the debit **inside a DB transaction BEFORE the AI call fires**. Insufficient →
   `PAYMENT_REQUIRED`, no AI call.
4. **Only now call the model.** If the AI call then fails, **refund** the reserved credits to the
   **same bucket(s)** they came from (a `refund` ledger row) so a provider error never costs the
   user.

**The cardinal rule: check tier → reserve credits → THEN generate. Never generate first and
debit after** — that ordering is the money-leak hole (a scripted burst of premium calls would
run up the Cloudflare/OpenRouter bill with nothing debited).

This composes with the existing abuse guards (`free-cap.guard.ts`, burst/global caps in
`src/server/service/rate-limit/`): those still run first for anon flood protection; the
tier+credit gate is the paid-path equivalent. Premium models are additionally a natural place to
keep a per-user burst cap (a compromised paid account shouldn't be able to drain its balance in
one scripted second, and shouldn't be able to spike your provider bill).

## 6. Rollover / expiry

Following the universal industry rule (§9):

- **Purchased credits (packs + open top-up): never expire.** Simplest, most trustworthy for the
  BD market, and matches every competitor's treatment of *bought* credits.
- If we ever add **subscription** credits (monthly allowance), those **expire monthly** — but
  that's a future plan, not v1. v1 is one-time purchases only.

## 7. Data model

Current `credits` (`billing.schema.ts`) holds `paidCredits: integer` — a bare balance, no
history, no free/paid split, and keyed only by `userId` (anon users have none). **Rework into a
cached balance with kinds + an append-only ledger** (standard for anything money-touching):

```
credit_accounts (was `credits`) — cached balance, ONE row per owner
  id
  userId         text?   -- set for logged-in owners
  anonymousId    text?   -- set for anon owners (exactly one of userId/anonymousId, like designs)
  freeBalance    integer -- cached FREE credits (anon grant + signup bonus)
  paidBalance    integer -- cached PAID credits (purchases)
  ...timestamps
  -- on claim-at-signup: the anon account's balances migrate to the user (subject to the
  --   "signup bonus REPLACES free balance" rule in §5 — set freeBalance = bonus, keep paid).

credit_transactions (NEW) — append-only ledger, one row per change
  id
  accountId      -- FK to credit_accounts
  delta          integer   -- +50 (anon_grant), +40 (signup), +175 (pack), -15 (generation), +15 (refund)
  kind           enum      -- free | paid  (WHICH bucket this row moves — §5)
  reason         enum      -- anon_grant | signup_bonus | purchase | generation | refund | admin_adjust
  freeAfter      integer   -- free-bucket snapshot after this row
  paidAfter      integer   -- paid-bucket snapshot after this row
  modelId        text?     -- which model (on generation debits) → per-model analytics
  paymentId      text?     -- FK to payments (on purchase credits)
  createdAt
```

Rules encoded here:
- **`kind` (free/paid)** on every row is what lets the gate (§5b) spend the right bucket and
  refund to the right bucket. A single free-model generation may write two debit rows (free
  first, then paid) if free runs short.
- **`anon_grant`** — guarded by composite identity (anonymousId OR IP OR fingerprint, §5); one
  grant per device/network, not per cookie.
- **`signup_bonus`** — once per account (`unique(accountId, reason='signup_bonus')`), and **SETS**
  `freeBalance` to the bonus (replace, not add — §5).
- **`purchase`** — adds to `paidBalance`, linked via `paymentId`.
- Keep the two cached balances on `credit_accounts` for fast reads; **every** change writes a
  ledger row AND updates the cache **in one DB transaction** (never drift).
- The ledger gives us: refunds, disputes ("why is my balance 7?"), per-model cost analytics, and
  fraud investigation — none of which a bare integer can answer.

`payments` table already exists (SSLCommerz-shaped) and is unchanged — a successful payment →
one `purchase`/`paid` ledger row linked via `paymentId`.

`payments` table already exists (SSLCommerz-shaped: `amountBdt`, `creditsPurchased`, `tranId`,
`status`, `raw`). A successful payment → one `purchase` credit_transaction linked via
`paymentId`. Works for both fixed packs and open top-ups (creditsPurchased is just computed
differently upstream).

## 8. Service API + build phases

```ts
CreditService = {
  getBalance(userId): number,
  grant(userId, delta, reason, meta?): txn,        // packs, open top-up, bonus, refund
  reserve(userId, modelId): txn | throws,          // §5b: tier+balance check, debit BEFORE the AI call
  refund(userId, txnId, reason): txn,              // §5b step 4: give back on AI failure
}
// resolveModelForUser(user, requested) → the ACTUALLY-allowed model, enforced server-side (§5b).
```

**Phase 1 — Credit system + tier gate (NO payment code):**
1. `src/config/credits.ts` — `MODELS` (cost + tier), packs, open-top-up rate + min/max.
2. Schema — add `credit_transactions`; keep `paidCredits` as cache.
3. `CreditService` — balance / grant / reserve / refund, all ledger-writing in a txn.
4. `resolveModelForUser` + wire the **§5b gate** into the `generate` handler in order:
   resolve model server-side → tier check → `reserve()` → call AI → `refund()` on failure.
   (Free/anon path still runs the existing free-cap + burst guards.)
5. Replace `mockCreditState` (`src/lib/mock-data.ts`, used in the credit badge) with real
   `getBalance`.
6. Seed/admin grant to test end-to-end — incl. a premium-model call that a free user is
   rejected for and a paid user is charged for. Fully demoable with zero payment code.

**Phase 2 — SSLCommerz (BD):** init route + IPN webhook → on success calls
`CreditService.grant(userId, credits, "purchase", { paymentId })`. Wire `/pricing` packs AND the
open-top-up amount field.

**Phase 3 — Stripe (later, international):** a second adapter behind the same `grant()` seam. No
credit-logic changes.

## 9. Industry research (what the big players do)

All confirm the abstract-credit + variable-cost design.

| Company | Unit | Cheap action | Premium action | $/credit | Rollover |
|---|---|---|---|---|---|
| Leonardo | Token | 1 (default image) | 16 (Alchemy), ~2,500 (Veo video) | ~$0.001–0.0014 | paid rolls to capped bank; **packs never expire**; free daily tokens don't roll |
| Adobe Firefly | Credit | 1 (fill) | 10 (Image 5), 20 (Ultra), 100/s (video) | ~$0.004–0.005 | **no rollover** any tier |
| Runway | Credit | 5/s (Gen-4 Turbo) | 12–25/s (Gen-4.5) | $0.01 (PAYG) | monthly resets, no roll; **purchased never expire** |
| Pika | Credit | 10 (Turbo) | 20–80 (Pro), ×resolution | $0.011 in-plan / $0.027 PAYG | plan credits expire; **add-on credits roll indefinitely** |
| Canva | 3 fixed "AI use" buckets (Standard/Premium/Ultra) | routes pricey models to scarcer bucket | bundled | no rollover | — |

**Cross-company patterns we adopt:**
1. **One credit currency; new/pricier models just cost more credits per use** — nobody reprices
   packs when adding a flagship model (Runway Turbo 5→Gen-4.5 25 c/s; Pika Turbo 10→Pro 20).
   This is the 10–20× solution.
2. **Higher-res / longer / heavier = multiply on top of model tier** (Pika 480p→1080p ~doubles).
   We can extend `MODEL_CREDIT_COST` to a `(model, options)` function if we add resolution tiers.
3. **Purchased credits never expire; subscription credits do.** We only ship purchased credits
   in v1 → never expire.
4. **PAYG/open top-up ~2× the best pack rate** — our open top-up is priced slightly above the
   Value pack for the same reason.
5. **Free tiers are lead-gen, not usable products** — our 5-generation cap fits.

**Caveats:** a few premium figures (Leonardo Veo ~2,500 tokens, Runway Gen-4.5 rate) come from
third-party sources, not official docs — directional only; the *pattern* is solid across all six.

## 10. Decisions locked / still open

**Locked (this design reflects them):**
- Abstract credits + per-model cost; **free credits → free models, paid credits → premium/
  flagship** (§2, §5).
- Pricing: 1 credit = ৳2 ($0.0167); packs ৳100–2000; **open top-up from $5 (৳600), flat ৳2/
  credit** (§3–4). All tiers hold >40% margin.
- Selected models: FREE Cloudflare klein · PREMIUM Gemini Nano Banana · FLAGSHIP gpt-image-1/2.
- Anon grant guarded by composite identity; **signup bonus once/account, REPLACES** anon free
  balance; purchases **sum** (§5).
- AI-failure → **refund** to the same bucket (§5b).

**Still open (tune in config, no code change):**
- Exact anon-grant size (e.g. 50 free credits) and signup-bonus size (e.g. 40).
- Open top-up **max ceiling** ($500?) and whether a volume-bonus curve is added later.
- Whether OpenRouter stays as the free fallback or is dropped (its $0.016/img is a real, if
  rare, cost — Cloudflare overflow at $0.0013 is cheaper).

**Verify before locking margins:** fal.ai per-image prices came from aggregators (fal blocks
bots); confirm live in the fal dashboard — esp. Redux's *per-megapixel* billing (a 2MP room
photo doubles cost). Gemini has a **batch tier ($0.0195/img, 24h)** that lifts premium margin to
~80% if delay is acceptable.
