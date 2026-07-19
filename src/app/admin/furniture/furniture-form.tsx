"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { FURNITURE_CONDITIONS, FURNITURE_SOURCES, REGIONS } from "@/db/schemas/shared.schema";
import type { FurnitureItem } from "@/db/types";
import {
  type CreateFurnitureInput,
  CreateFurnitureSchema,
} from "@/db/validations/furniture.validation";
import { rpc } from "@/server/rpc/client";

/*
 * Create / edit a furniture item — FormFactory convention (config-driven fields + shared Zod
 * schema + react-hook-form), mirroring VendorForm. Category options are passed in (fetched by the
 * opener) so the master-category select can render. Editing when `item` is passed.
 */

export function FurnitureForm({
  item,
  categories,
  closeModal,
}: {
  item?: FurnitureItem;
  categories: { id: string; name: string }[];
  closeModal: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const fields: FieldConfig<CreateFurnitureInput>[] = [
    { name: "name", label: "Name", type: "text", isRequired: true, placeholder: "Item name" },
    { name: "brand", label: "Brand", type: "text", placeholder: "Hatil, Otobi…" },
    {
      name: "categoryId",
      label: "Category",
      type: "select",
      options: categories.map((c) => ({ label: c.name, value: c.id })),
    },
    { name: "priceBdt", label: "Price (৳)", type: "number" },
    { name: "imageUrl", label: "Image URL", type: "text", placeholder: "https://…" },
    { name: "productUrl", label: "Product URL", type: "text", placeholder: "https://…" },
    {
      name: "condition",
      label: "Condition",
      type: "select",
      isRequired: true,
      options: FURNITURE_CONDITIONS.map((c) => ({ label: c, value: c })),
    },
    {
      name: "source",
      label: "Source",
      type: "select",
      isRequired: true,
      options: FURNITURE_SOURCES.map((s) => ({ label: s.replace(/_/g, " "), value: s })),
    },
    {
      name: "region",
      label: "Region",
      type: "select",
      options: REGIONS.map((r) => ({ label: r, value: r })),
    },
    { name: "isActive", label: "Active", type: "switch" },
  ];

  const defaultValues: CreateFurnitureInput = {
    name: item?.name ?? "",
    brand: item?.brand ?? "",
    categoryId: item?.categoryId ?? undefined,
    priceBdt: item?.priceBdt ?? undefined,
    imageUrl: item?.imageUrl ?? "",
    productUrl: item?.productUrl ?? "",
    condition: item?.condition ?? "new",
    source: item?.source ?? "brand",
    region: item?.region ?? "bd",
    isActive: item?.isActive ?? true,
    // dimensions is a jsonb sub-object not exposed in this simple form — preserved as-is on edit
    // by NOT overwriting it (update only sets provided fields). vendorId likewise omitted here.
    vendorId: item?.vendorId ?? undefined,
  };

  function onSubmit(data: CreateFurnitureInput) {
    start(async () => {
      try {
        if (item) {
          await rpc.furniture.update({ id: item.id, ...data });
        } else {
          await rpc.furniture.create(data);
        }
        toast.success(item ? "Item updated" : "Item created");
        closeModal();
        router.refresh();
      } catch {
        toast.error("Could not save the item.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif font-bold text-foreground text-xl">
        {item ? "Edit item" : "New item"}
      </h2>
      <FormFactory schema={CreateFurnitureSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
        <FieldFactory fields={fields} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={closeModal} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : item ? "Save" : "Create"}
          </Button>
        </div>
      </FormFactory>
    </div>
  );
}
