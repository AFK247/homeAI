/**
 * AI quality validation runner (PROJECT_CONTEXT.md §11).
 *
 * Runs your real room photos through one or more image models (img2img) across
 * the BD-authentic prompts, and writes outputs to output/ for you to eyeball.
 *
 * Models live behind adapters (see adapters/) — this file is just the runner and
 * knows nothing provider-specific. To add/switch models, edit adapters/registry.ts.
 *
 * Throwaway validation code — OUTSIDE src/, delete once the quality is judged.
 *
 * ─── HOW TO RUN ────────────────────────────────────────────────────────────
 *   1. Set the active model's credentials in .env (see adapters/registry.ts
 *      and each adapter's isReady()). Default model — Cloudflare FLUX.2 klein:
 *        CLOUDFLARE_ACCOUNT_ID=...
 *        CLOUDFLARE_API_TOKEN=...
 *   2. Drop 2–4 room photos into scripts/ai-quality-test/rooms/ (jpg/png).
 *   3. Run all active models:   bun scripts/ai-quality-test/validate.ts
 *      Or one specific model:   bun scripts/ai-quality-test/validate.ts cf-flux-klein
 *   4. Open scripts/ai-quality-test/output/ and judge (§11.5).
 * ───────────────────────────────────────────────────────────────────────────
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { selectAdapters } from "./adapters/registry";
import type { RoomImage } from "./adapters/types";
import { PROMPTS } from "./prompts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOMS_DIR = join(HERE, "rooms");
const OUT_DIR = join(HERE, "output");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function loadRooms(): (RoomImage & { name: string })[] {
  let files: string[];
  try {
    files = readdirSync(ROOMS_DIR);
  } catch {
    console.error(`✗ Could not read ${ROOMS_DIR}. Create it and add photos.`);
    process.exit(1);
  }
  const rooms = files
    .filter((f) => MIME[f.split(".").pop()?.toLowerCase() ?? ""])
    .map((f) => ({
      name: f,
      bytes: readFileSync(join(ROOMS_DIR, f)),
      mime: MIME[f.split(".").pop()?.toLowerCase() ?? ""] as string,
    }));
  if (rooms.length === 0) {
    console.error(
      `✗ No images in ${ROOMS_DIR}. Drop 2–4 room photos (jpg/png) and re-run.`,
    );
    process.exit(1);
  }
  return rooms;
}

async function main() {
  const adapters = selectAdapters(process.argv.slice(2));
  const rooms = loadRooms();

  // Skip adapters that aren't configured, and say why.
  const ready = adapters.filter((a) => {
    const status = a.isReady();
    if (!status.ok) console.log(`  ⤫ skipping ${a.label} — ${status.reason}`);
    return status.ok;
  });
  if (ready.length === 0) {
    console.error("\n✗ No models ready. Configure credentials in .env.\n");
    process.exit(1);
  }

  console.log(
    `\nAI quality validation\n` +
      `  models:  ${ready.map((a) => a.label).join(", ")}\n` +
      `  rooms:   ${rooms.length} (${rooms.map((r) => r.name).join(", ")})\n` +
      `  prompts: ${PROMPTS.length}\n` +
      `  → ${ready.length * rooms.length * PROMPTS.length} generations\n`,
  );

  let ok = 0;
  let fail = 0;

  for (const adapter of ready) {
    for (const room of rooms) {
      const base = room.name.replace(/\.[^.]+$/, "");
      for (const prompt of PROMPTS) {
        const tag = `${adapter.key} · ${base} · ${prompt.id}`;
        try {
          const bytes = await adapter.redesign(prompt.text, room);
          const out = `${base}__${prompt.id}__${adapter.key}.png`;
          writeFileSync(join(OUT_DIR, out), bytes);
          console.log(`  ✓ ${out}`);
          ok++;
        } catch (err) {
          console.log(`  ✗ FAILED — ${tag}\n    ${(err as Error).message}`);
          fail++;
        }
      }
    }
  }

  console.log(
    `\nDone. ${ok} generated, ${fail} failed.\n` +
      `Open scripts/ai-quality-test/output/ and judge the quality (§11.5).\n`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
