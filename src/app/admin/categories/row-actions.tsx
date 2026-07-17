"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rpc } from "@/server/rpc/client";

/*
 * Per-row admin actions for a category: approve (pending→active) and delete.
 * Client component — calls the oRPC mutations over HTTP, then refreshes the RSC.
 */
export function CategoryRowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex justify-end gap-1">
      {status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => rpc.category.approve({ id }))}
        >
          <Check className="size-3.5" /> Approve
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run(() => rpc.category.delete({ id }))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
