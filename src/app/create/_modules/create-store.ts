"use client";

import { create } from "zustand";
import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";

/*
 * Client store holding the create-flow selections across the routed steps:
 *   /create        → image + roomType
 *   /create/style  → style + budget + prompt, then calls generate
 *   /create/generating → reads state, runs the generation
 *
 * Ephemeral (not persisted) — a fresh flow starts empty.
 */

interface CreateState {
  /** Uploaded image as a data URL (data:image/...;base64,...). */
  image: string | null;
  imageMime: string;
  roomType: RoomType;
  style: DesignStyle;
  budget: BudgetTier;
  prompt: string;
  isPanorama: boolean;

  setImage: (image: string, mime: string) => void;
  setRoomType: (roomType: RoomType) => void;
  setStyle: (style: DesignStyle) => void;
  setBudget: (budget: BudgetTier) => void;
  setPrompt: (prompt: string) => void;
  setPanorama: (isPanorama: boolean) => void;
  reset: () => void;
}

const initial = {
  image: null,
  imageMime: "image/jpeg",
  roomType: "living_room" as RoomType,
  style: "modern" as DesignStyle,
  budget: "medium" as BudgetTier,
  prompt: "",
  isPanorama: false,
};

export const useCreateStore = create<CreateState>((set) => ({
  ...initial,
  setImage: (image, imageMime) => set({ image, imageMime }),
  setRoomType: (roomType) => set({ roomType }),
  setStyle: (style) => set({ style }),
  setBudget: (budget) => set({ budget }),
  setPrompt: (prompt) => set({ prompt }),
  setPanorama: (isPanorama) => set({ isPanorama }),
  reset: () => set(initial),
}));
