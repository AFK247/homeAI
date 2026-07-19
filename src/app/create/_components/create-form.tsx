"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { GeneratingLoader } from "@/components/brand/generating-loader";
import { DesignWorkspace } from "@/components/design/design-workspace";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { handleORPCError } from "@/lib/utils/error";
import { handleRateLimitError } from "@/lib/utils/rate-limit-error";
import { rpc } from "@/server/rpc/client";
import { useCreateStore } from "../_modules/create-store";
import { UploadPanel } from "./upload-panel";

/*
 * Create route adapter over the shared DesignWorkspace. Wires the Zustand draft store to
 * the workspace controls and runs the first generation, then redirects to the result route
 * (which renders the same workspace, server-loaded). The image lives client-side (Zustand)
 * until the first generate — there's no entity to server-load yet.
 */
export function CreateForm() {
  const { dict } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const image = useCreateStore((s) => s.image);
  const roomType = useCreateStore((s) => s.roomType);
  const style = useCreateStore((s) => s.style);
  const budget = useCreateStore((s) => s.budget);
  const prompt = useCreateStore((s) => s.prompt);
  const setRoomType = useCreateStore((s) => s.setRoomType);
  const setStyle = useCreateStore((s) => s.setStyle);
  const setBudget = useCreateStore((s) => s.setBudget);
  const setPrompt = useCreateStore((s) => s.setPrompt);

  function generate() {
    const s = useCreateStore.getState();
    if (!s.image) return; // guarded — button is disabled without an image
    startTransition(async () => {
      try {
        const design = await rpc.design.generate({
          image: s.image as string,
          imageMime:
            s.imageMime === "image/png" || s.imageMime === "image/webp"
              ? s.imageMime
              : "image/jpeg",
          roomType: s.roomType,
          style: s.style,
          budget: s.budget,
          prompt: s.prompt || undefined,
          isPanorama: s.isPanorama,
        });
        useCreateStore.getState().reset();
        router.replace(PAGES.RESULT.VIEW(design.id));
      } catch (err) {
        // Credit / abuse-defense denials get a tailored toast: anon out-of-credits → Sign-in CTA,
        // logged-in out-of-credits → Buy-credits CTA. Anything else → generic handler.
        if (
          !handleRateLimitError(
            err,
            dict.rateLimit,
            () => router.push(PAGES.LOGIN),
            () => router.push(PAGES.PRICING),
          )
        ) {
          handleORPCError(err);
        }
      }
    });
  }

  return (
    <DesignWorkspace
      values={{ roomType, style, budget, prompt }}
      onChange={{
        roomType: setRoomType,
        style: setStyle,
        budget: setBudget,
        prompt: setPrompt,
      }}
      controlsDisabled={pending}
      canvas={
        <div className="relative">
          <UploadPanel />
          {pending ? <GeneratingLoader /> : null}
        </div>
      }
      primaryAction={{
        label: pending ? dict.generating.title : dict.style.generate,
        disabled: !image || pending,
        loading: pending,
        onClick: generate,
      }}
      actionNote={
        !image ? <span className="text-muted-foreground">{dict.create.uploadFirst}</span> : null
      }
    />
  );
}
