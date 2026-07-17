"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/db/types";
import { rpc } from "@/server/rpc/client";
import { VendorForm } from "./vendor-form";

/* Per-row vendor actions: edit (opens the form modal) and delete (confirm alert). */
export function VendorRowActions({ vendor }: { vendor: Vendor }) {
  const { openModal, closeModal } = useModal();
  const router = useRouter();

  const edit = () =>
    openModal({
      type: "custom",
      component: () => <VendorForm vendor={vendor} closeModal={closeModal} />,
      className: "sm:max-w-md",
    });

  const remove = () =>
    openModal({
      type: "alert",
      variant: "destructive",
      title: `Delete ${vendor.name}?`,
      description: "This removes the vendor. Its products are kept but unlinked.",
      actionLabel: "Delete",
      onConfirm: async () => {
        await rpc.vendor.delete({ id: vendor.id });
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
