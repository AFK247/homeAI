"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { ROOM_TYPES, type RoomType } from "@/db/schemas/shared.schema";
import type { Category } from "@/db/types";
import {
  type CreateCategoryInput,
  CreateCategorySchema,
} from "@/db/validations/category.validation";
import { rpc } from "@/server/rpc/client";

/*
 * Create / edit a master category — built on the ported FormFactory convention. `name` is
 * English (the join key); `roomTypes` picks which rooms the AI detects it in.
 */

const FIELDS: FieldConfig<CreateCategoryInput>[] = [
  {
    name: "name",
    label: "Name (English)",
    type: "text",
    isRequired: true,
    placeholder: "e.g. sofa",
    inputFilter: (v) => v.toLowerCase(),
  },
  {
    name: "roomTypes",
    label: "AI-detected in rooms",
    description:
      "Rooms where the vision detector looks for this category. Empty = not auto-detected.",
    type: "multiselect",
    options: ROOM_TYPES.map((r) => ({ label: r.replace(/_/g, " "), value: r })),
  },
];

export function CategoryForm({
  category,
  closeModal,
}: {
  category?: Category;
  closeModal: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const defaultValues: CreateCategoryInput = {
    name: category?.name ?? "",
    roomTypes: (category?.roomTypes as RoomType[]) ?? [],
    status: category?.status ?? "active",
    source: category?.source ?? "manual",
  };

  function onSubmit(data: CreateCategoryInput) {
    start(async () => {
      try {
        if (category) {
          await rpc.category.update({
            id: category.id,
            name: data.name,
            roomTypes: data.roomTypes,
          });
        } else {
          await rpc.category.create(data);
        }
        toast.success(category ? "Category updated" : "Category created");
        closeModal();
        router.refresh();
      } catch {
        toast.error("Could not save. The name may already exist.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif font-bold text-foreground text-xl">
        {category ? "Edit category" : "New category"}
      </h2>
      <FormFactory schema={CreateCategorySchema} defaultValues={defaultValues} onSubmit={onSubmit}>
        <FieldFactory fields={FIELDS} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={closeModal} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : category ? "Save" : "Create"}
          </Button>
        </div>
      </FormFactory>
    </div>
  );
}
