"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROOM_OPTIONS } from "@/config/catalog";
import { useTranslation } from "@/lib/i18n/client";
import { useCreateStore } from "../_modules/create-store";

/*
 * Client island: room-type grid + "next" button. Enabled only once an image is
 * chosen. Kept in one island because both read the same store state.
 */
export function RoomPicker() {
  const { dict, locale } = useTranslation();
  const router = useRouter();
  const image = useCreateStore((s) => s.image);
  const roomType = useCreateStore((s) => s.roomType);
  const setRoomType = useCreateStore((s) => s.setRoomType);

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-6 shadow-sm">
      <h2 className="font-bold text-foreground">{dict.upload.roomType}</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {ROOM_OPTIONS.map((room) => (
          <button
            type="button"
            key={room.value}
            onClick={() => setRoomType(room.value)}
            className={
              roomType === room.value
                ? "flex items-center justify-between rounded-xl border-[1.5px] border-primary bg-secondary px-3.5 py-3 font-semibold text-secondary-foreground text-sm"
                : "rounded-xl border-[1.5px] border-border px-3.5 py-3 text-left font-semibold text-foreground text-sm"
            }
          >
            {room[locale]}
            {roomType === room.value && <Check className="size-4" />}
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-auto"
        disabled={!image}
        onClick={() => router.push("/create/style")}
      >
        {dict.common.next}
      </Button>
    </div>
  );
}
