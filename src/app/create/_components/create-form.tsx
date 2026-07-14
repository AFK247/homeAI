"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { Button } from "@/components/ui/button";
import { BUDGET_OPTIONS, ROOM_OPTIONS, STYLE_OPTIONS } from "@/config/catalog";
import { PAGES } from "@/config/pages";
import { useTranslation } from "@/lib/i18n/client";
import { handleORPCError } from "@/lib/utils/error";
import { rpc } from "@/server/rpc/client";
import { useCreateStore } from "../_modules/create-store";
import { UploadPanel } from "./upload-panel";

/*
 * Single-page create form. Everything is on one screen — upload, room, style,
 * budget, optional prompt — so the user configures once and generates. Only the
 * IMAGE is mandatory; room/style/budget carry smart defaults (living room /
 * modern / medium), so a user can upload → Generate immediately. Generate is
 * guarded on the image and shows what's missing.
 */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 font-bold text-foreground">{children}</h2>;
}

export function CreateForm() {
  const { dict, locale } = useTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

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
    setFailed(false);
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
        handleORPCError(err);
        setFailed(true);
      }
    });
  }

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1.4fr_1fr]">
      {/* Left: upload + style grid */}
      <div className="flex flex-col gap-7">
        <UploadPanel />

        <div>
          <SectionTitle>{dict.style.title}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLE_OPTIONS.map((s) => (
              <button
                type="button"
                key={s.value}
                onClick={() => setStyle(s.value)}
                className={
                  style === s.value
                    ? "overflow-hidden rounded-2xl border-[2.5px] border-primary text-left shadow-sm"
                    : "overflow-hidden rounded-2xl border-[1.5px] border-border text-left transition-colors hover:border-primary/50"
                }
              >
                <ImagePlaceholder className="h-24" />
                <div className="bg-card p-2.5">
                  <div className="font-bold text-foreground text-sm">{s.bn}</div>
                  <div className="text-muted-foreground text-xs">{s.en}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: room + budget + prompt + generate */}
      <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm lg:sticky lg:top-6">
        <div>
          <SectionTitle>{dict.upload.roomType}</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {ROOM_OPTIONS.map((room) => (
              <button
                type="button"
                key={room.value}
                onClick={() => setRoomType(room.value)}
                className={
                  roomType === room.value
                    ? "flex items-center justify-between rounded-xl border-[1.5px] border-primary bg-secondary px-3.5 py-3 font-semibold text-secondary-foreground text-sm"
                    : "rounded-xl border-[1.5px] border-border px-3.5 py-3 text-left font-semibold text-foreground text-sm transition-colors hover:border-primary/50"
                }
              >
                {room[locale]}
                {roomType === room.value && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>{dict.style.budget}</SectionTitle>
          <div className="flex gap-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                type="button"
                key={b.value}
                onClick={() => setBudget(b.value)}
                className={
                  budget === b.value
                    ? "flex-1 rounded-xl border-[1.5px] border-primary bg-secondary py-2.5 font-semibold text-secondary-foreground text-sm"
                    : "flex-1 rounded-xl border-[1.5px] border-border py-2.5 font-semibold text-foreground text-sm transition-colors hover:border-primary/50"
                }
              >
                {b[locale]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle>
            {dict.style.customPrompt}{" "}
            <span className="font-medium text-muted-foreground">{dict.common.optional}</span>
          </SectionTitle>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={500}
            placeholder={dict.style.promptPlaceholder}
            className="min-h-20 w-full resize-none rounded-xl border-[1.5px] border-border p-3.5 text-foreground text-sm placeholder:text-brand-faint focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mt-1">
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={!image || pending}
            onClick={generate}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> {dict.generating.title}
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> {dict.style.generate}
              </>
            )}
          </Button>
          {!image && (
            <p className="mt-2 text-center text-muted-foreground text-xs">
              {dict.create.uploadFirst}
            </p>
          )}
          {failed && (
            <p className="mt-2 text-center text-destructive text-xs">{dict.create.failed}</p>
          )}
        </div>
      </div>
    </div>
  );
}
