"use client";

import { Sprout } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { rpc } from "@/server/rpc/client";

/*
 * "Seed master list" — inserts any missing seed categories (idempotent). A header action
 * for the categories page so the admin can populate the vocabulary in one click.
 */
export function SeedCategoriesButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { added } = await rpc.category.seed();
          toast.success(added > 0 ? `Added ${added} categories` : "Already seeded");
          router.refresh();
        })
      }
    >
      <Sprout className="size-4" /> Seed master list
    </Button>
  );
}
