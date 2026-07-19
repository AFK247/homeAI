"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { rpc } from "@/server/rpc/client";
import { FurnitureForm } from "./furniture-form";

/* Header action: fetch active categories, then open the create-item form modal. */
export function NewItemButton() {
  const { openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const cats = await rpc.category.listActive();
      const categories = cats.map((c) => ({ id: c.id, name: c.name }));
      openModal({
        type: "custom",
        component: () => <FurnitureForm categories={categories} closeModal={closeModal} />,
        className: "sm:max-w-md",
      });
    } catch {
      toast.error("Could not open the form.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={open} disabled={loading}>
      <Plus className="size-4" /> New item
    </Button>
  );
}
