"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { rpc } from "@/server/rpc/client";

/*
 * Per-row actions for a vendor→master mapping: remap to a different master category
 * (fixes a bad AI guess), approve (pending→active), delete. Client component — the
 * category list is passed in from the server page. Uses a native <select> to avoid
 * pulling in a new UI dependency.
 */
export function MapActions({
  id,
  categoryId,
  status,
  categories,
}: {
  id: string;
  categoryId: string | null;
  status: string;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="flex items-center justify-end gap-2">
      <select
        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        value={categoryId ?? ""}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          if (v && v !== categoryId) run(() => rpc.category.updateMap({ id, categoryId: v }));
        }}
      >
        <option value="" disabled>
          Remap…
        </option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => rpc.category.approveMap({ id }))}
        >
          <Check className="size-3.5" /> Approve
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run(() => rpc.category.deleteMap({ id }))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
