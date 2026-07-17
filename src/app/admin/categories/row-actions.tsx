"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import type { Category } from "@/db/types";
import { rpc } from "@/server/rpc/client";
import { CategoryForm } from "./category-form";

/*
 * Per-row admin actions for a category: approve (pending→active), edit, and delete.
 * Client component — calls the oRPC mutations over HTTP, then refreshes the RSC.
 */
export function CategoryRowActions({ category }: { category: Category }) {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const edit = () =>
    openModal({
      type: "custom",
      component: () => <CategoryForm category={category} closeModal={closeModal} />,
      className: "sm:max-w-md",
    });

  return (
    <div className="flex justify-end gap-1">
      {category.status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => rpc.category.approve({ id: category.id }))}
        >
          <Check className="size-3.5" /> Approve
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={pending} onClick={edit}>
        <Pencil className="size-3.5" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run(() => rpc.category.delete({ id: category.id }))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
