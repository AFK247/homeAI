import "server-only";

import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";

/*
 * Private prompt assembly for the redesign (trade-secret — PROJECT_CONTEXT §12),
 * built on 2026 expert guidance for interior img2img editing (FLUX.2 klein /
 * FLUX Kontext / Nano-Banana). Data-driven: style/room/budget are typed lookup
 * tables so the prompt is specific and every parameter actually reaches the model.
 *
 * The models we use are INSTRUCTION EDITORS (FLUX klein / Kontext) — they anchor
 * on the source photo and need (a) an imperative "redesign this ROOM" instruction,
 * (b) concrete materials/furniture/lighting, and (c) an explicit PRESERVATION
 * clause. The preservation clause is the single highest-leverage fix for the
 * "moved walls / changed camera angle / warped geometry" failure mode, so it is
 * always present and phrased with proven BFL/Kontext wording.
 */

interface StyleSpec {
  /** How to name the style to the model (may differ from the enum key). */
  name: string;
  /** 2–3 concrete MATERIALS/finishes — far stronger than colour words. */
  materials: string;
  /** Style-defining furniture cues. */
  furniture: string;
  /** Lighting description. */
  lighting: string;
  /** A single mood word/phrase — controls contrast, warmth, clutter. */
  mood: string;
}

// Bangladesh-authentic direction per style (local materials, family-scale seating).
const STYLE: Record<DesignStyle, StyleSpec> = {
  modern: {
    name: "warm modern",
    materials: "rich teak-toned wood (Hatil/Otobi tones), smooth matte plaster, brushed metal",
    furniture: "clean-lined large family sofa set, low wooden coffee table, media console",
    lighting: "soft warm ambient lighting with natural daylight",
    mood: "clean, uncluttered, inviting",
  },
  traditional_bangla: {
    name: "traditional Bengali heritage",
    materials: "carved dark hardwood, terracotta and brass accents, nakshi kantha textiles",
    furniture: "a divan with bolster cushions, carved wooden seating, patterned rugs",
    lighting: "warm ambient lighting",
    mood: "timeless, rooted, elegant",
  },
  minimal: {
    name: "clean minimal contemporary",
    materials: "light oak, neutral matte surfaces, subtle brass accents",
    furniture: "a comfortable large sofa set, a local wooden coffee table, hidden storage",
    lighting: "abundant natural daylight",
    mood: "calm, quiet, spacious",
  },
  luxury: {
    name: "upscale luxury",
    materials: "marble and travertine, premium solid wood, brushed brass, velvet and bouclé",
    furniture: "an elegant large-family seating suite, a statement stone table, a brass floor lamp",
    lighting: "layered warm accent lighting",
    mood: "refined, editorial, magazine-quality",
  },
  scandinavian: {
    name: "liveable Scandinavian-influenced",
    materials: "pale woods (beech/oak), soft linen and wool textiles, light flooring",
    furniture: "a beige modular family sofa, a round oak coffee table, a light wool rug",
    lighting: "bright diffused daylight",
    mood: "cozy, serene, warm",
  },
  classic: {
    name: "classic elegant",
    materials: "timeless dark hardwood, upholstered wood-frame seating, patterned rugs",
    furniture: "a tufted sofa, symmetrical wooden furniture, refined cabinetry",
    lighting: "warm ambient lighting",
    mood: "timeless, symmetrical, elegant",
  },
};

interface RoomSpec {
  /** Human label used in the imperative instruction. */
  label: string;
  /** The defining furniture for this room's FUNCTION — ensures correct pieces. */
  furniture: string;
}

const ROOM: Record<RoomType, RoomSpec> = {
  living_room: {
    label: "living room",
    furniture: "a sofa set, a coffee table, a TV/media console, an area rug, and shelving",
  },
  bedroom: {
    label: "bedroom",
    furniture: "a bed with headboard, two nightstands, a wardrobe, and a soft rug",
  },
  dining_room: {
    label: "dining room",
    furniture: "a dining table with chairs, a sideboard, and a pendant light over the table",
  },
  kitchen: {
    label: "kitchen",
    furniture: "fitted cabinetry, a durable countertop, a tiled backsplash, and practical storage",
  },
  prayer_corner: {
    label: "prayer corner",
    furniture:
      "a modest prayer mat area, a low wooden shelf/niche for the Qur'an, and uncluttered floor space",
  },
  kids_room: {
    label: "kids room",
    furniture: "a twin/bunk bed, low storage, a soft play rug, and cheerful rounded furniture",
  },
};

interface BudgetSpec {
  /** Material vocabulary that signals the tier (never the word "cheap"). */
  materials: string;
  /** Quality anchor phrase. */
  quality: string;
}

const BUDGET: Record<BudgetTier, BudgetSpec> = {
  low: {
    materials: "affordable laminate and engineered wood, simple cotton upholstery, ceramic tile",
    quality: "a realistic budget-friendly home, simple, functional and practical",
  },
  medium: {
    materials: "solid oak veneer, linen and cotton upholstery, powder-coated metal, quartz",
    quality: "well-made, comfortable and tasteful, a few statement pieces among quality basics",
  },
  premium: {
    materials: "marble, solid walnut, brushed brass, natural stone, velvet and designer finishes",
    quality: "high-end and bespoke, interior-magazine quality, curated and refined",
  },
};

/*
 * The prompt LEADS with a hard preservation lock (anchors the whole edit), then
 * scopes exactly what may change, then the style detail, then re-asserts the
 * lock at the end. For edit models the constraint must bracket the instruction,
 * not sit buried in the middle — that is what stops walls/windows/doors moving.
 */

// Opening lock — the first thing the model reads. Enumerates every fixed element.
const PRESERVATION_LEAD =
  "This is a STRICT interior restyle of an existing room photo. You MUST keep the " +
  "room's architecture and structure 100% identical to the original. Do NOT move, " +
  "add, remove, resize, or redraw any of these fixed elements: walls, windows, " +
  "window positions and sizes, doors, doorways, the ceiling, ceiling height, " +
  "beams, columns, the floor plane, and the overall room shape and layout. Keep " +
  "the EXACT same camera angle, viewpoint, perspective, and proportions as the " +
  "original photo. The wall, window, and door positions in your output must line " +
  "up exactly with the input.";

// What is ALLOWED to change — scopes the edit tightly to non-structural elements.
const SCOPE =
  "You may ONLY change movable and cosmetic elements: furniture, decor, textiles, " +
  "rugs, curtains, lighting fixtures, artwork, plants, and surface finishes " +
  "(wall paint colour, flooring material) — without changing where the walls, " +
  "windows and doors are.";

// Closing re-assertion + quality guards (positive framing — no negative field).
const PRESERVATION_TAIL =
  "Do not distort the geometry; keep walls straight and vertical, and windows and " +
  "doors in their original places. Furniture rests naturally on the floor. " +
  "Photorealistic, same room, same structure. No extra windows or doors, no moved " +
  "walls, no warped perspective, no duplicate or floating furniture, no text, no watermark.";

export interface PromptParams {
  style: DesignStyle;
  roomType: RoomType;
  budget: BudgetTier;
  userPrompt?: string | null;
}

/**
 * Build the redesign edit prompt. Preservation lock FIRST, then the allowed
 * scope, then style/room/budget detail, then a closing re-assertion — the
 * bracketing keeps the model from altering the room's fixed architecture.
 */
export function buildRedesignPrompt({ style, roomType, budget, userPrompt }: PromptParams): string {
  const s = STYLE[style];
  const r = ROOM[roomType];
  const b = BUDGET[budget];

  const parts = [
    PRESERVATION_LEAD,
    SCOPE,
    `Restyle this ${r.label} into a ${s.name} interior using ${s.materials}, with ${b.materials}.`,
    `Furnish it with ${r.furniture}, arranged within the existing layout.`,
    `${s.lighting}. ${b.quality}, ${s.mood}.`,
    userPrompt?.trim() ? `Also incorporate (without altering the architecture): ${userPrompt.trim()}.` : "",
    PRESERVATION_TAIL,
  ];
  return parts.filter(Boolean).join(" ");
}
