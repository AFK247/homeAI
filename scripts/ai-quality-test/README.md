# AI quality validation

> The gate from `PROJECT_CONTEXT.md §11`: **prove the AI redesign works on real
> Bangladeshi rooms before building the pipeline.** This folder is throwaway —
> delete it once you've judged the quality.

## What it does

Runs your real room photos through **Cloudflare Workers AI — FLUX.2 [klein] 9B**
(img2img editing) across several **BD-authentic** redesign prompts, and writes the
outputs to `output/` so you can compare with your own eyes.

FLUX.2 klein is a modern 2026 model on Cloudflare's **free tier** (~20–50 images/day),
so this validation costs ~$0.

## Run it

1. **Cloudflare dashboard** → get two things:
   - **Account ID** — Workers & Pages overview, right sidebar
   - **API Token** — My Profile → API Tokens → Create → **Workers AI** template
     (Account · Workers AI · Read + Edit)
2. Add to `.env` in the project root:
   ```
   CLOUDFLARE_ACCOUNT_ID=your_account_id
   CLOUDFLARE_API_TOKEN=your_token
   ```
3. Put **2–4 photos** in `rooms/` (jpg/png). Per §11, include a normal room photo,
   a **phone panorama**, and a **floor plan** (to test floor-plan → room).
4. Run:
   ```bash
   bun scripts/ai-quality-test/validate.ts
   ```
5. Open `output/` and **look**. Does it clear the bar? Does it read as
   *Bangladeshi* (not generic Scandinavian/Japandi)?

## Tuning (this IS the work — §12)

The prompt is the hard, valuable part. Edit `prompts.ts`, add your own directions,
re-run. The model id lives at the top of `validate.ts` (`MODEL`).

## What "passing" means

If the output looks good and authentically local → proceed to Phase 1D (backend +
real AI pipeline). If not → the redesign hook needs work (better prompts, reference
images, a stronger model) **before** you invest in the pipeline.
