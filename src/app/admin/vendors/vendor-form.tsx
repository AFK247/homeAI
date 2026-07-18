"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { VENDOR_TYPES } from "@/db/schemas/shared.schema";
import type { Vendor } from "@/db/types";
import { type CreateVendorInput, CreateVendorSchema } from "@/db/validations/vendor.validation";
import { rpc } from "@/server/rpc/client";

/*
 * Create / edit a vendor — built on the ported FormFactory convention (config-driven
 * fields + shared Zod schema + react-hook-form). Editing when `vendor` is passed.
 */

const FIELDS: FieldConfig<CreateVendorInput>[] = [
  { name: "name", label: "Name", type: "text", isRequired: true, placeholder: "Vendor name" },
  {
    name: "type",
    label: "Type",
    type: "select",
    isRequired: true,
    options: VENDOR_TYPES.map((t) => ({ label: t.replace(/_/g, " "), value: t })),
  },
  { name: "websiteUrl", label: "Website", type: "text", placeholder: "https://…" },
  { name: "contact", label: "Contact", type: "text" },
  { name: "isVerified", label: "Verified", type: "switch" },
];

export function VendorForm({ vendor, closeModal }: { vendor?: Vendor; closeModal: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const defaultValues: CreateVendorInput = {
    name: vendor?.name ?? "",
    type: vendor?.type ?? "brand",
    websiteUrl: vendor?.websiteUrl ?? "",
    contact: vendor?.contact ?? "",
    isVerified: vendor?.isVerified ?? false,
    commissionRate: vendor?.commissionRate ?? undefined,
  };

  function onSubmit(data: CreateVendorInput) {
    start(async () => {
      try {
        if (vendor) {
          await rpc.vendor.update({ id: vendor.id, ...data });
        } else {
          await rpc.vendor.create(data);
        }
        toast.success(vendor ? "Vendor updated" : "Vendor created");
        closeModal();
        router.refresh();
      } catch {
        toast.error("Could not save the vendor.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif font-bold text-foreground text-xl">
        {vendor ? "Edit vendor" : "New vendor"}
      </h2>
      <FormFactory schema={CreateVendorSchema} defaultValues={defaultValues} onSubmit={onSubmit}>
        <FieldFactory fields={FIELDS} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={closeModal} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : vendor ? "Save" : "Create"}
          </Button>
        </div>
      </FormFactory>
    </div>
  );
}
