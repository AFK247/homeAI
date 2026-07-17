"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROOM_TYPES, type RoomType } from "@/db/schemas/shared.schema";
import type { Category } from "@/db/types";
import { rpc } from "@/server/rpc/client";

/*
 * Create / edit a master category. `name` is English (the join key); `roomTypes` picks
 * which rooms the AI detects it in. Rendered inside the imperative modal. Editing keeps
 * the existing status; new categories are created active (admin-made, not AI-proposed).
 */
export function CategoryForm({
  category,
  closeModal,
}: {
  category?: Category;
  closeModal: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(category?.name ?? "");
  const [rooms, setRooms] = useState<RoomType[]>((category?.roomTypes as RoomType[]) ?? []);

  const toggleRoom = (r: RoomType) =>
    setRooms((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    start(async () => {
      try {
        if (category) {
          await rpc.category.update({ id: category.id, name: name.trim(), roomTypes: rooms });
        } else {
          await rpc.category.create({
            name: name.trim(),
            roomTypes: rooms,
            status: "active",
            source: "manual",
          });
        }
        closeModal();
        router.refresh();
      } catch {
        setError("Could not save. The name may already exist.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif font-bold text-foreground text-xl">
        {category ? "Edit category" : "New category"}
      </h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-name">Name (English)</Label>
        <Input
          id="c-name"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          placeholder="e.g. sofa"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>AI-detected in rooms</Label>
        <div className="flex flex-wrap gap-2">
          {ROOM_TYPES.map((r) => {
            const on = rooms.includes(r);
            return (
              <button
                key={r}
                type="button"
                onClick={() => toggleRoom(r)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-brand-body hover:bg-muted"
                }`}
              >
                {r.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Rooms where the vision detector looks for this category. Leave empty to keep it in the
          catalog but not auto-detect it.
        </p>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={closeModal} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : category ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}
