"use client";

import { Plus } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "./category-form";

/* Header action: open the create-category form modal. */
export function NewCategoryButton() {
  const { openModal, closeModal } = useModal();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        openModal({
          type: "custom",
          component: () => <CategoryForm closeModal={closeModal} />,
          className: "sm:max-w-md",
        })
      }
    >
      <Plus className="size-4" /> New
    </Button>
  );
}
