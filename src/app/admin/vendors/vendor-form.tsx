"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VENDOR_TYPES } from "@/db/schemas/shared.schema";
import type { Vendor } from "@/db/types";
import { rpc } from "@/server/rpc/client";

/*
 * Create / edit a vendor. Rendered inside the imperative modal (receives `closeModal`).
 * When `vendor` is passed it edits; otherwise it creates. Refreshes the table on success.
 */
export function VendorForm({ vendor, closeModal }: { vendor?: Vendor; closeModal: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(vendor?.name ?? "");
  const [type, setType] = useState<(typeof VENDOR_TYPES)[number]>(vendor?.type ?? "brand");
  const [websiteUrl, setWebsiteUrl] = useState(vendor?.websiteUrl ?? "");
  const [contact, setContact] = useState(vendor?.contact ?? "");
  const [isVerified, setIsVerified] = useState(vendor?.isVerified ?? false);

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    start(async () => {
      try {
        const payload = {
          name: name.trim(),
          type,
          websiteUrl: websiteUrl.trim() || undefined,
          contact: contact.trim() || undefined,
          isVerified,
        };
        if (vendor) {
          await rpc.vendor.update({ id: vendor.id, ...payload });
        } else {
          await rpc.vendor.create(payload);
        }
        closeModal();
        router.refresh();
      } catch {
        setError("Could not save. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-serif font-bold text-foreground text-xl">
        {vendor ? "Edit vendor" : "New vendor"}
      </h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-name">Name</Label>
        <Input id="v-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-type">Type</Label>
        <select
          id="v-type"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof VENDOR_TYPES)[number])}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-web">Website</Label>
        <Input
          id="v-web"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://…"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="v-contact">Contact</Label>
        <Input id="v-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isVerified}
          onChange={(e) => setIsVerified(e.target.checked)}
          className="size-4"
        />
        Verified vendor
      </label>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={closeModal} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : vendor ? "Save" : "Create"}
        </Button>
      </div>
    </div>
  );
}
