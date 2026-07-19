"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { FurnitureRow } from "@/app/result/_modules/furniture.router";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { rpc } from "@/server/rpc/client";
import { FurnitureForm } from "./furniture-form";

/*
 * Per-row furniture actions: edit (fetches the FULL item + active categories, then opens the form
 * modal — the table row is only a projection) and delete (confirm alert).
 */
export function FurnitureRowActions({ item }: { item: FurnitureRow }) {
  const { openModal, closeModal } = useModal();
  const router = useRouter();

  const edit = async () => {
    try {
      const [full, cats] = await Promise.all([
        rpc.furniture.getById({ id: item.id }),
        rpc.category.listActive(),
      ]);
      if (!full) {
        toast.error("Item not found.");
        return;
      }
      const categories = cats.map((c) => ({ id: c.id, name: c.name }));
      openModal({
        type: "custom",
        component: () => (
          <FurnitureForm item={full} categories={categories} closeModal={closeModal} />
        ),
        className: "sm:max-w-md",
      });
    } catch {
      toast.error("Could not open the item.");
    }
  };

  const remove = () =>
    openModal({
      type: "alert",
      variant: "destructive",
      title: `Delete ${item.name}?`,
      description: "This permanently removes the catalog item.",
      actionLabel: "Delete",
      onConfirm: async () => {
        await rpc.furniture.delete({ id: item.id });
        router.refresh();
      },
    });

  return (
    <div className="flex justify-end gap-1">
      <Button size="sm" variant="ghost" onClick={edit}>
        <Pencil className="size-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={remove}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
