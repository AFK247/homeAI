"use client";

import { Plus } from "lucide-react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { VendorForm } from "./vendor-form";

/* Header action: open the create-vendor form modal. */
export function NewVendorButton() {
  const { openModal, closeModal } = useModal();
  return (
    <Button
      size="sm"
      onClick={() =>
        openModal({
          type: "custom",
          component: () => <VendorForm closeModal={closeModal} />,
          className: "sm:max-w-md",
        })
      }
    >
      <Plus className="size-4" /> New vendor
    </Button>
  );
}
