/*
 * Single source of truth for the active AI image-generation provider/model.
 * Both the AI service and the admin provider page read from here, so the admin
 * page always reflects what's actually running.
 */
export const AI_PROVIDER = {
  provider: "Cloudflare Workers AI",
  model: "FLUX.2 [klein] 9B",
  modelId: "@cf/black-forest-labs/flux-2-klein-9b",
  vendor: "Black Forest Labs",
  mode: "Image-to-image (img2img) editing",
  sync: true, // returns the image in one request (no job/polling)
  steps: 4, // distilled model — fixed
  freeTier: "~20–50 images/day on Cloudflare's free neuron allocation",
  releaseYear: 2026,
  docsUrl: "https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/",
  notes: [
    "Synchronous: one request returns the redesigned image (no queue/polling).",
    "Prompts are assembled server-side and kept private (trade secret).",
    "Swappable via the adapter design — changing provider/model touches only ai.service.ts.",
    "Requires a secure context; runs against Cloudflare's account-scoped endpoint.",
  ],
} as const;
