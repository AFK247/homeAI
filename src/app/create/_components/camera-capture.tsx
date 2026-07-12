"use client";

import { Camera, RefreshCw, SwitchCamera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/client";

/*
 * Live camera capture (getUserMedia). Rendered inside the imperative modal via
 * openModal({ type: "custom", component: CameraCapture }). Shows a live preview,
 * captures a still to a data URL, and hands it back through `onCapture`.
 *
 * Notes:
 *  - getUserMedia requires a secure context (https or localhost).
 *  - Defaults to the rear camera (facingMode: "environment") for photographing a
 *    room; user can switch to front.
 *  - The stream is always stopped on unmount/close so the camera light turns off.
 */
export function CameraCapture({
  closeModal,
  onCapture,
}: {
  closeModal: () => void;
  onCapture: (dataUrl: string, mime: string) => void;
}) {
  const { dict } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [status, setStatus] = useState<"starting" | "live" | "error">("starting");
  const [shot, setShot] = useState<string | null>(null);

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (mode: "environment" | "user") => {
      stop();
      setStatus("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("live");
      } catch {
        setStatus("error");
      }
    },
    [stop],
  );

  // Start on mount and whenever the facing mode changes; always stop on cleanup.
  // biome-ignore lint/correctness/useExhaustiveDependencies: start/stop are stable
  useEffect(() => {
    if (!shot) start(facing);
    return stop;
  }, [facing, shot]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
    stop();
  }

  function usePhoto() {
    if (!shot) return;
    onCapture(shot, "image/jpeg");
    closeModal();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        {shot ? (
          // biome-ignore lint/performance/noImgElement: local data-URL preview
          <img src={shot} alt={dict.upload.imageAlt} className="size-full object-cover" />
        ) : (
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
        )}
        {status === "starting" && !shot ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
            {dict.upload.starting}
          </div>
        ) : null}
        {status === "error" ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
            {dict.upload.cameraError}
          </div>
        ) : null}
      </div>

      {shot ? (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => setShot(null)}>
            <RefreshCw className="size-4" /> {dict.upload.retake}
          </Button>
          <Button className="flex-1" onClick={usePhoto}>
            {dict.upload.usePhoto}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            title={dict.upload.switchCamera}
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          >
            <SwitchCamera className="size-4" />
          </Button>
          <Button className="flex-1 gap-2" disabled={status !== "live"} onClick={capture}>
            <Camera className="size-4" /> {dict.upload.capture}
          </Button>
        </div>
      )}
    </div>
  );
}
