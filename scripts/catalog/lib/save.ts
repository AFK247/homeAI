import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScrapedProduct } from "./types";

/** Absolute path to scripts/catalog/output/<brand>. */
function brandDir(brand: string): string {
  return join(import.meta.dirname, "..", "output", brand);
}

/** Slugify a product name/url into a safe image filename. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/** Pick a file extension from an image URL, defaulting to jpg. */
function extFromUrl(url: string): string {
  const m = url.split("?")[0]?.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  return m?.[1] ? m[1].toLowerCase() : "jpg";
}

/**
 * Download one product image into output/<brand>/images/ and return the local
 * filename (or null on failure — a broken image must not abort the whole run).
 */
export async function downloadImage(
  brand: string,
  url: string,
  nameHint: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const filename = `${slugify(nameHint)}.${extFromUrl(url)}`;
    const dir = join(brandDir(brand), "images");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buf);
    return filename;
  } catch {
    return null;
  }
}

/** Write all scraped products for a brand to output/<brand>/products.json. */
export async function writeProducts(brand: string, products: ScrapedProduct[]): Promise<string> {
  const dir = brandDir(brand);
  await mkdir(dir, { recursive: true });
  const file = join(dir, "products.json");
  await writeFile(file, JSON.stringify(products, null, 2));
  return file;
}
