import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/*
 * AI category mapper (docs/marketplace-plan.md §3, Phase 3). Given a vendor's raw category
 * strings and the current master vocabulary, ask the AI to map each raw string to an
 * EXISTING master category, or propose a NEW one when nothing fits. Runs as a single batch
 * call (cheap, rare). Results are written as `pending` by the caller for admin review.
 *
 * Uses Cloudflare Workers AI (text LLM) — same account/token/neuron budget as the
 * moondream vision + FLUX image generation. The model is hardcoded (CATEGORY_MODEL).
 */

// llama-3.1-8b-fast is the sweet spot for category mapping (live-benchmarked on real
// vendor data): ~8.4 neurons/call — basically the same as the 3B (~7.8) but WITHOUT the
// 3B's habit of inventing duplicate categories, and 6× cheaper than the 70B for
// equal/better quality.
export const CATEGORY_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const TIMEOUT_MS = 30_000;

/** Admin-surface status for the category-mapping model (shown on the AI Provider page). */
export function categoryModelStatus() {
  return {
    key: "category-mapper",
    label: "Cloudflare (Llama 3.1 8B)",
    model: CATEGORY_MODEL,
    ready: Boolean(env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_API_TOKEN),
  };
}

/** One raw→master decision from the AI. */
export interface CategoryMapping {
  raw: string;
  /** The chosen master category name. If `isNew`, it's a proposed new category. */
  category: string;
  isNew: boolean;
}

type CfResponse = {
  success?: boolean;
  result?: {
    // Newer Cloudflare chat models return an OpenAI-style `choices` array…
    choices?: Array<{ message?: { content?: string } }>;
    // …older ones return a flat `response` string. Support both.
    response?: string;
  };
  errors?: Array<{ message?: string }>;
};

/** Pull the first JSON array out of the model's text and parse it; [] on any failure. */
function parseMappings(content: string): CategoryMapping[] {
  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.raw === "string" && typeof m.category === "string")
      .map((m) => ({
        raw: m.raw,
        category: String(m.category).toLowerCase().trim(),
        isNew: !!m.isNew,
      }));
  } catch {
    return [];
  }
}

/**
 * Map raw vendor categories to master categories via one Cloudflare LLM call.
 * @param rawCategories the vendor's distinct raw category strings
 * @param masterCategories the current active master vocabulary (names)
 */
export async function mapCategories(
  rawCategories: string[],
  masterCategories: string[],
): Promise<CategoryMapping[]> {
  if (rawCategories.length === 0) return [];
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    throw new Error("Cloudflare credentials not set");
  }

  const system =
    "You map furniture vendor category names to a master category list. " +
    "STRONGLY PREFER an existing master category — always map to the closest existing one. " +
    "A compound name maps to its base type: 'folding chair'->'dining chair' or 'armchair', " +
    "'bar stool'->'stool', 'sofa cum bed'->'sofa'. Never invent a more generic duplicate of " +
    "categories that already exist (e.g. do NOT propose 'chair' when 'armchair'/'dining chair' " +
    "/'office chair' exist). Only set isNew=true when NOTHING in the list reasonably fits, and " +
    "then give a specific lowercase name. " +
    'Respond ONLY with a JSON array, no prose: [{"raw":"...","category":"...","isNew":false}].';

  const user =
    `Master categories: ${JSON.stringify(masterCategories)}\n` +
    `Raw categories to map: ${JSON.stringify(rawCategories)}`;

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${CATEGORY_MODEL}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0,
      stream: false,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    logger.warn({ status: res.status, detail }, "category mapper failed");
    throw new Error(`category mapper HTTP ${res.status}`);
  }

  const json = (await res.json()) as CfResponse;
  if (json.success === false) {
    throw new Error(`category mapper: ${json.errors?.[0]?.message ?? "unknown error"}`);
  }
  const content = json.result?.choices?.[0]?.message?.content ?? json.result?.response ?? "";
  const mappings = parseMappings(content);

  // Safety: only trust "existing" claims that really exist; otherwise treat as new.
  const known = new Set(masterCategories.map((c) => c.toLowerCase()));
  return mappings.map((m) => ({ ...m, isNew: m.isNew || !known.has(m.category) }));
}
