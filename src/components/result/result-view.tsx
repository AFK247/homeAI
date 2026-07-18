"use client";

import { Expand, Eye, EyeOff, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { GeneratingLoader } from "@/components/brand/generating-loader";
import { ImagePlaceholder } from "@/components/brand/image-placeholder";
import { DesignWorkspace } from "@/components/design/design-workspace";
import { FurniturePin } from "@/components/furniture/furniture-pin";
import { useCategoryProducts } from "@/components/furniture/use-category-products";
import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import type { DesignWithTags, ResolvedDesignTag } from "@/db/types";
import { useTranslation } from "@/lib/i18n/client";
import { rpc } from "@/server/rpc/client";
import { VersionHistory } from "./version-history";

/*
 * Result route adapter over the shared DesignWorkspace. The parameter controls (room /
 * style / budget / prompt) are seeded from the saved design and stay editable, so the user
 * can tweak them and Regenerate — producing a new version that reflects the changes. The
 * generated image + pins live in the canvas; the furniture list + version history sit
 * below it. Same layout as the create route.
 */
export function ResultView({ design }: { design: DesignWithTags }) {
  const { dict } = useTranslation();
  const openCategory = useCategoryProducts();
  const router = useRouter();
  const [regenerating, startRegenerate] = useTransition();
  const [versionKey, setVersionKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [pinsVisible, setPinsVisible] = useState(true);

  // Editable controls, seeded from the saved design. Budget isn't persisted (per-render),
  // so it defaults to medium each load.
  const [roomType, setRoomType] = useState<RoomType>(design.roomType);
  const [style, setStyle] = useState<DesignStyle>(design.style);
  const [budget, setBudget] = useState<BudgetTier>("medium");
  const [prompt, setPrompt] = useState(design.prompt ?? "");

  const hasPins = design.tags.length > 0;

  // Pins are detected on the server AFTER the image returns, so a fresh design arrives with
  // none for a few seconds. Poll (bounded) until they appear; show an on-image indicator.
  const isDone = design.status === "done" && Boolean(design.generatedImageUrl);
  const [pollsLeft, setPollsLeft] = useState(6);
  const findingFurniture = isDone && !hasPins && pollsLeft > 0;

  useEffect(() => {
    if (!findingFurniture) return;
    const id = setTimeout(() => {
      setPollsLeft((n) => n - 1);
      router.refresh();
    }, 2500);
    return () => clearTimeout(id);
  }, [findingFurniture, router]);

  const categories = dedupeCategories(design.tags);

  const openTagCategory = (tag: ResolvedDesignTag) => {
    if (tag.categoryId && tag.categoryName) openCategory(tag.categoryId, tag.categoryName);
  };

  // Did the user change any persisted parameter? (Budget isn't persisted, so it doesn't
  // count toward "changes" — but it's still sent on every regenerate.)
  const dirty =
    roomType !== design.roomType || style !== design.style || prompt !== (design.prompt ?? "");

  function regenerate() {
    startRegenerate(async () => {
      try {
        await rpc.design.regenerate({
          id: design.id,
          budget,
          roomType,
          style,
          prompt: prompt || undefined,
        });
        setVersionKey((k) => k + 1);
        setPollsLeft(6); // new render → detect pins again
        router.refresh();
      } catch {
        // Swallow; the button re-enables.
      }
    });
  }

  const canvas = (
    <div className="relative h-[340px] overflow-hidden rounded-2xl lg:h-[470px]">
      {design.generatedImageUrl ? (
        <Image
          src={design.generatedImageUrl}
          alt={dict.result.imageAlt}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
      ) : (
        <ImagePlaceholder label={dict.result.imageAlt} className="size-full" />
      )}

      {design.generatedImageUrl && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {hasPins && (
            <button
              type="button"
              onClick={() => setPinsVisible((v) => !v)}
              aria-label={pinsVisible ? dict.result.hidePins : dict.result.showPins}
              title={pinsVisible ? dict.result.hidePins : dict.result.showPins}
              className="flex size-9 items-center justify-center rounded-full bg-[rgba(22,44,36,0.72)] text-white transition-colors hover:bg-[rgba(22,44,36,0.9)]"
            >
              {pinsVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            aria-label={dict.result.fullscreen}
            title={dict.result.fullscreen}
            className="flex size-9 items-center justify-center rounded-full bg-[rgba(22,44,36,0.72)] text-white transition-colors hover:bg-[rgba(22,44,36,0.9)]"
          >
            <Expand className="size-4" />
          </button>
        </div>
      )}

      {regenerating && <GeneratingLoader />}

      {findingFurniture && !regenerating && (
        <div className="absolute bottom-3 left-1/2 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-[rgba(22,44,36,0.82)] py-1.5 pr-4 pl-2 text-white shadow-lg">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          <span className="truncate font-semibold text-xs">{dict.generating.progress}</span>
        </div>
      )}

      {pinsVisible &&
        !regenerating &&
        design.tags.map((tag) => <FurniturePin key={tag.id} tag={tag} onOpen={openTagCategory} />)}
    </div>
  );

  const belowCanvas = (
    <div className="flex flex-col gap-5">
      <p className="text-center text-muted-foreground text-sm">{dict.result.tapHint}</p>
      <VersionHistory designId={design.id} refreshKey={versionKey} />

      <div>
        <h2 className="mb-3 font-serif font-bold text-foreground text-lg">
          {dict.result.furnitureHeading}
        </h2>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {findingFurniture ? dict.generating.progress : dict.result.tapHint}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <button
                type="button"
                key={c.categoryId}
                onClick={() => openCategory(c.categoryId, c.categoryName)}
                className="flex items-center gap-2.5 rounded-2xl bg-card p-2.5 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                {c.previewImageUrl ? (
                  // biome-ignore lint/performance/noImgElement: hotlinked external vendor image
                  <img
                    src={c.previewImageUrl}
                    alt={c.categoryName}
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <ImagePlaceholder className="size-12 shrink-0 rounded-xl" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-foreground text-sm capitalize">
                    {c.categoryName}
                  </div>
                  <div className="truncate text-muted-foreground text-xs">Shop similar</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <DesignWorkspace
        values={{ roomType, style, budget, prompt }}
        onChange={{
          roomType: setRoomType,
          style: setStyle,
          budget: setBudget,
          prompt: setPrompt,
        }}
        controlsDisabled={regenerating}
        canvas={canvas}
        belowCanvas={belowCanvas}
        primaryAction={{
          label: regenerating
            ? dict.result.regenerating
            : dirty
              ? dict.result.regenerateChanges
              : dict.result.regenerate,
          disabled: regenerating,
          loading: regenerating,
          onClick: regenerate,
        }}
      />

      {fullscreen && design.generatedImageUrl && (
        <button
          type="button"
          aria-label={dict.result.fullscreen}
          onClick={() => setFullscreen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="relative h-full w-full">
            <Image
              src={design.generatedImageUrl}
              alt={dict.result.imageAlt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <span className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
            <X className="size-5" />
          </span>
        </button>
      )}
    </>
  );
}

interface CategoryRow {
  categoryId: string;
  categoryName: string;
  previewImageUrl: string | null;
}

/** One row per distinct resolved category across the pins (order of first appearance). */
function dedupeCategories(tags: ResolvedDesignTag[]): CategoryRow[] {
  const byId = new Map<string, CategoryRow>();
  for (const t of tags) {
    if (!t.categoryId || !t.categoryName) continue;
    const existing = byId.get(t.categoryId);
    const img = t.furnitureItem?.imageUrl ?? null;
    if (existing) {
      if (!existing.previewImageUrl && img) existing.previewImageUrl = img;
    } else {
      byId.set(t.categoryId, {
        categoryId: t.categoryId,
        categoryName: t.categoryName,
        previewImageUrl: img,
      });
    }
  }
  return [...byId.values()];
}
