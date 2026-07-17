# Catalog ingestion — vendor scrapers

Scrapes real furniture from Bangladeshi vendor websites and ingests it into the app's
`furniture_items` table, so furniture pins can link to real, buyable products. See
`docs/marketplace-plan.md` for the full design.

Two steps, deliberately separate (scraping is slow/browser-based; ingesting is
fast/DB-only and must never hang on a browser):

## 1. Scrape → JSON

```bash
bun run scripts/catalog/vendors/hatil.ts       # → output/hatil/products.json
bun run scripts/catalog/vendors/brothers.ts    # → output/brothers/products.json
```

Each vendor has its own adapter under `vendors/` (site HTML differs), sharing `lib/`
(`browser.ts` Playwright wrapper, `save.ts` JSON writer, `types.ts`). Images are
**hotlinked** — we store the vendor's `imageUrl`, never download the file.

## 2. Ingest JSON → DB

```bash
bun --conditions=react-server run scripts/catalog/ingest.ts hatil
bun --conditions=react-server run scripts/catalog/ingest.ts brothers
```

One generic runner for all vendors. It: ensures the vendor row → AI-maps the vendor's raw
categories to master categories (Phase 3, written **pending** for admin approval) →
resolves each product's category via **approved** mappings → upserts `furniture_items`
(`region=bd`, dedupe by `productUrl`). Requires `--conditions=react-server` because it
imports server-only DB modules.

Products whose category mapping isn't approved yet still ingest (with `categoryId` null)
and become matchable once you approve the mapping in `/admin/categories/mappings`.

## Adding a vendor

1. Write `vendors/<name>.ts` exporting `scrape<Name>()` (copy hatil/brothers).
2. Add its slug → display name to `VENDOR_NAMES` in `ingest.ts`.
3. Scrape, then ingest, then approve its category mappings in admin.

## Notes

- **No vendor offers an API** — scraping public pages is the only option. Both Hatil and
  Brothers are JS-rendered / bot-protected, so both need Playwright (a real browser).
  Hatil's public sitemap gives the product URL list; Brothers is crawled per category.
- **Legality:** scrape politely (throttled, real user-agent), link back to the vendor to
  buy, and pursue partnerships as we grow. See `docs/marketplace-plan.md` §2.3.
- **Fragility:** selectors are best-effort; a site redesign breaks that one adapter.
  Prices/stock go stale and need a scheduled re-scrape (future cron).
