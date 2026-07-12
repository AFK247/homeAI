/**
 * Phase 0 — candidate redesign prompts for authentic Bangladeshi interiors.
 *
 * Per PROJECT_CONTEXT.md §12: the API call is trivial; the PROMPT is the hard,
 * valuable, differentiating part. Global models default to Scandinavian/Japandi —
 * these prompts push the model toward a look that reads *right* for a Dhaka flat.
 *
 * This is a starting point. Phase 0 is trial-and-error: edit these, add your own,
 * re-run, and judge with your own eyes which direction clears the bar.
 *
 * NOTE: keep the shared IMG2IMG_RULES first so the model edits the ACTUAL room
 * (walls, windows, proportions preserved) instead of inventing a new one.
 */

const IMG2IMG_RULES = `You are redesigning THIS actual room. Preserve the existing architecture exactly:
keep the real wall positions, window and door locations, ceiling height, and overall
room proportions. Do not invent a different room. Only restyle the furniture, decor,
textiles, lighting, and finishes. Photorealistic result, same camera angle.`;

export interface RedesignPrompt {
  id: string;
  label: string;
  text: string;
}

export const PROMPTS: RedesignPrompt[] = [
  {
    id: "bd-modern-warm",
    label: "Modern Bangladeshi — warm & family",
    text: `${IMG2IMG_RULES}

Redesign as a warm, modern middle-class Bangladeshi living room. Rich wooden furniture
in the style of Hatil/Otobi (teak/sheesham tones), a large family seating arrangement
for a big household, handwoven jute or cotton rugs, warm indoor lighting suited to
Dhaka apartments. Include space for gathering. Avoid cold minimalist Scandinavian or
Japandi aesthetics — this should feel authentically Bangladeshi and lived-in.`,
  },
  {
    id: "bd-traditional",
    label: "Traditional Bangladeshi — heritage",
    text: `${IMG2IMG_RULES}

Redesign with traditional Bangladeshi / Bengali heritage character: dark carved wood
furniture, a divan/takhat with bolster cushions (kolbalish), terracotta and brass
accents, nakshi kantha textiles, potted greenery on the veranda edge. Warm, rich,
culturally rooted — not generic Western.`,
  },
  {
    id: "bd-contemporary-clean",
    label: "Contemporary — clean but local",
    text: `${IMG2IMG_RULES}

Redesign as a clean contemporary Dhaka apartment living room, but keep it Bangladeshi:
neutral walls, a comfortable large sofa set for a big family, local wooden coffee table,
subtle brass/terracotta accents, a prayer-friendly quiet corner, warm daylight through
the existing windows. Practical for a real BD household, not a showroom.`,
  },
  {
    id: "bd-budget-realistic",
    label: "Budget-realistic — attainable",
    text: `${IMG2IMG_RULES}

Redesign affordably for a typical Bangladeshi family on a modest budget: sensible
locally-available furniture, a functional sofa set, simple wooden pieces, practical
storage, warm lighting, one or two decorative touches. It should look attainable and
real for a middle-income Dhaka home — not luxury, not a magazine set.`,
  },
];
