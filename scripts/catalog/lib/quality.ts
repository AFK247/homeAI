import type { ScrapedProduct } from "./types";

/*
 * Data-quality gate for scraped products. The biggest silent-failure mode in scraping is a changed
 * selector: a product still "succeeds" but comes back with name="(unknown)" / price=null / no image
 * and gets saved as a valid catalog row. This module turns those into VISIBLE signals:
 *
 *   - isUsableProduct()  — a product is only worth staging if it has a real name AND a price. Those
 *     two are the minimum for a buyable catalog item; missing either usually means a broken selector,
 *     not a real product, so we DON'T stage it (it's reported as a failed URL with the reason).
 *   - summarizeHealth()  — a run-level rollup ("10/12 missing price → likely selector break") so a
 *     site-wide selector break is obvious at a glance instead of hiding as null columns in the DB.
 */

/** Why a scraped product isn't usable (null = it's fine). */
export function productIssue(p: ScrapedProduct): string | null {
  if (!p.name || p.name.trim() === "" || p.name === "(unknown)") return "missing name";
  if (p.priceBdt == null || p.priceBdt <= 0) return "missing price";
  return null;
}

/** A product is stageable only if it has a real name + price. Image/dimensions are nice-to-have. */
export function isUsableProduct(p: ScrapedProduct): boolean {
  return productIssue(p) === null;
}

export interface RunHealth {
  scraped: number; // usable products staged
  failed: number; // URLs that failed / were rejected
  missingImage: number; // staged products with no image (soft warning)
  missingDimensions: number;
  /** A human warning when a large share is degraded — a likely selector break. */
  warning: string | null;
}

/**
 * Roll up a finished run into a health summary. `total` is the URLs attempted this run. Flags a
 * likely selector break when a large fraction failed or a majority of staged rows lack an image.
 */
export function summarizeHealth(
  staged: ScrapedProduct[],
  failed: number,
  total: number,
): RunHealth {
  const missingImage = staged.filter((p) => !p.imageUrl).length;
  const missingDimensions = staged.filter((p) => !p.dimensions).length;

  let warning: string | null = null;
  const attempted = total || staged.length + failed;
  if (attempted > 0) {
    const failRate = failed / attempted;
    if (failRate >= 0.5) {
      warning = `${failed}/${attempted} URLs failed — likely a selector break or site change.`;
    } else if (staged.length > 0 && missingImage / staged.length >= 0.5) {
      warning = `${missingImage}/${staged.length} products have no image — check the image selector.`;
    }
  }

  return { scraped: staged.length, failed, missingImage, missingDimensions, warning };
}
