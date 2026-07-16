import "server-only";

import type { RoomType } from "@/db/schemas/shared.schema";
import { logger } from "@/lib/logger";
import { detectWithFallback } from "./registry";
import { ROOM_TARGETS } from "./targets";
import type { DetectedTag } from "./types";

/*
 * Furniture tagging — the only entry point callers use. Detects what the AI actually
 * placed in a generated design and returns one pin per physical item.
 *
 * Vendor-agnostic by construction: this file never names a model. Detection goes
 * through the provider chain (registry.ts); everything here is provider-independent
 * clean-up of raw boxes.
 *
 * Never throws: pins are a bonus on top of a successful generation, so any failure
 * degrades to an empty list rather than failing the design.
 */

/** A pin ready to persist: label + centre as 0..100 % of the image. */
export interface FurnitureTag {
  label: string;
  xPct: number;
  yPct: number;
}

/**
 * Ignore boxes smaller than this share of the image — specks and partial mis-hits,
 * not furniture. Tuned on a real render: a stray part-of-a-chair box was 0.4% and a
 * genuinely small but shoppable pendant lamp was 0.8%, so the floor sits just below
 * the lamp. (Fitted to one sample — revisit with more.)
 */
const MIN_AREA_FRAC = 0.007;
/** Boxes overlapping more than this show the same object, whatever they're called. */
const DUP_IOU = 0.45;
/**
 * If one box sits this far inside another of the SAME label, it's a double-fire on
 * one object. Cross-label containment is NOT deduped: chairs tucked under a dining
 * table are ~70% inside the table's box, but both are separately shoppable.
 */
const CONTAINED_FRAC = 0.7;
/** Cap pins so a busy room stays readable. */
const MAX_PINS = 8;

function intersection(a: DetectedTag, b: DetectedTag): number {
  const [ax1, ay1, ax2, ay2] = a.box;
  const [bx1, by1, bx2, by2] = b.box;
  const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const ih = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  return iw * ih;
}

/** True when two boxes almost certainly show the SAME physical object. */
function isSameObject(a: DetectedTag, b: DetectedTag): boolean {
  const inter = intersection(a, b);
  if (inter === 0) return false;
  if (inter / (a.areaFrac + b.areaFrac - inter) >= DUP_IOU) return true;
  if (a.label !== b.label) return false;
  return inter / Math.min(a.areaFrac, b.areaFrac) >= CONTAINED_FRAC;
}

/** Drop specks, collapse duplicates (largest wins), cap the count. */
function toPins(raw: DetectedTag[]): FurnitureTag[] {
  const kept: DetectedTag[] = [];
  for (const tag of raw
    .filter((t) => t.areaFrac >= MIN_AREA_FRAC)
    .sort((a, b) => b.areaFrac - a.areaFrac)) {
    if (!kept.some((k) => isSameObject(tag, k))) kept.push(tag);
  }
  return kept.slice(0, MAX_PINS).map((t) => ({
    label: t.label,
    xPct: Math.round(t.xPct * 100) / 100,
    yPct: Math.round(t.yPct * 100) / 100,
  }));
}

export const TagService = {
  /** Detect furniture pins in a generated design. Returns [] on any failure. */
  detect: async (
    imageBytes: Buffer,
    imageMime: string,
    roomType: RoomType,
  ): Promise<FurnitureTag[]> => {
    try {
      const { tags } = await detectWithFallback({
        imageBytes,
        imageMime,
        targets: ROOM_TARGETS[roomType],
      });
      return toPins(tags);
    } catch (err) {
      logger.warn({ err, roomType }, "furniture tagging failed — no pins");
      return [];
    }
  },
};
