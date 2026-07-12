/**
 * Model registry — the single place to turn adapters on/off.
 *
 * ─── TO ADD A MODEL ────────────────────────────────────────────────────────
 *   1. Create  adapters/<your-model>.ts  exporting an ImageModelAdapter
 *      (copy cloudflare-flux-klein.ts as a template).
 *   2. Import it here and add it to ACTIVE.
 *   That's it — validate.ts picks it up automatically.
 *
 * ─── TO SWITCH MODELS ──────────────────────────────────────────────────────
 *   Edit ACTIVE below (comment/uncomment). Or run one model ad hoc:
 *      bun scripts/ai-quality-test/validate.ts cf-flux-klein
 *   (CLI args filter ACTIVE by adapter `key`.)
 */

import { cloudflareFluxKlein } from "./cloudflare-flux-klein";
import { cloudflareSd15 } from "./cloudflare-sd15";
import type { ImageModelAdapter } from "./types";

/** Every adapter that exists (registered or not). */
export const ALL: ImageModelAdapter[] = [cloudflareFluxKlein, cloudflareSd15];

/** Adapters the runner uses by default. Keep this list to what you want to compare. */
export const ACTIVE: ImageModelAdapter[] = [
  cloudflareFluxKlein,
  // cloudflareSd15,   // ← uncomment for a side-by-side SD-1.5 comparison
];

/** Resolve which adapters to run: CLI keys filter ACTIVE, else all of ACTIVE. */
export function selectAdapters(keys: string[]): ImageModelAdapter[] {
  if (keys.length === 0) return ACTIVE;
  const byKey = new Map(ALL.map((a) => [a.key, a]));
  const picked: ImageModelAdapter[] = [];
  for (const k of keys) {
    const a = byKey.get(k);
    if (!a) {
      const known = ALL.map((x) => x.key).join(", ");
      throw new Error(`unknown model key "${k}". known keys: ${known}`);
    }
    picked.push(a);
  }
  return picked;
}
