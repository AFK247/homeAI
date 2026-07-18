"use client";

import imageCompression from "browser-image-compression";
import { Camera, Globe, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useModal } from "@/components/modal/modal.store";
import { useTranslation } from "@/lib/i18n/client";
import { useCreateStore } from "../_modules/create-store";
import { CameraCapture } from "./camera-capture";

/*
 * Client island: the upload column (dropzone/preview + camera + panorama toggle).
 * Interactive only — the surrounding page stays a Server Component.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

const COMPRESS_OPTS = { maxWidthOrHeight: 1280, maxSizeMB: 1.5, useWebWorker: true };
// Reject before compression: cap the raw file and require an image type. The
// compressor shrinks well within the server's limit; this just blocks obviously
// bad picks (giant files, non-images) with a clean message.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB raw
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function UploadPanel() {
  const { dict } = useTranslation();
  const openModal = useModal((s) => s.openModal);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const image = useCreateStore((s) => s.image);
  const isPanorama = useCreateStore((s) => s.isPanorama);
  const setImage = useCreateStore((s) => s.setImage);
  const setPanorama = useCreateStore((s) => s.setPanorama);

  async function ingest(file: File) {
    // Validate before compressing — the compressor can hang/error on huge or
    // non-image inputs. The server enforces its own hard cap regardless.
    if (!ACCEPTED_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
      setError(dict.upload.invalidFile);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const compressed = await imageCompression(file, COMPRESS_OPTS);
      setImage(await fileToDataUrl(compressed), compressed.type || "image/jpeg");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File | undefined) {
    if (file) await ingest(file);
  }

  function openCamera() {
    openModal({
      type: "custom",
      title: dict.upload.cameraTitle,
      // The imperative modal types `component` loosely; CameraCapture validates
      // its own props (onCapture + injected closeModal).
      component: CameraCapture as never,
      props: {
        onCapture: async (dataUrl: string) => {
          await ingest(await dataUrlToFile(dataUrl, "camera.jpg"));
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-[#C4CCBF] border-dashed p-6 text-center"
        style={
          image
            ? undefined
            : {
                background:
                  "repeating-linear-gradient(45deg,#EDEFE6,#EDEFE6 13px,#E0E5D8 13px,#E0E5D8 26px)",
                padding: "4rem",
              }
        }
      >
        {image ? (
          // biome-ignore lint/performance/noImgElement: local data-URL preview
          <img
            src={image}
            alt={dict.upload.imageAlt}
            className="max-h-72 w-full rounded-2xl object-contain"
          />
        ) : (
          <>
            <div className="flex size-16 items-center justify-center rounded-2xl bg-card shadow-md">
              <Upload className="size-7 text-primary" />
            </div>
            <div>
              <div className="font-bold text-foreground text-lg">{dict.upload.dropzone}</div>
              <div className="mt-1 text-brand-body text-sm">{dict.upload.fileHint}</div>
            </div>
          </>
        )}
      </button>
      {busy && <p className="text-brand-body text-sm">{dict.upload.preparing}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-3.5">
        <button
          type="button"
          onClick={openCamera}
          className="flex flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4"
        >
          <Camera className="size-6 text-foreground" />
          <span className="font-semibold text-foreground text-sm">{dict.upload.camera}</span>
        </button>
        <button
          type="button"
          onClick={() => setPanorama(!isPanorama)}
          className={
            isPanorama
              ? "flex flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-primary bg-secondary p-4"
              : "flex flex-1 items-center gap-3 rounded-2xl border-[1.5px] border-border bg-card p-4"
          }
        >
          <Globe className="size-6 text-foreground" />
          <span className="font-semibold text-foreground text-sm">{dict.upload.panorama}</span>
        </button>
      </div>
    </div>
  );
}
