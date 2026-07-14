"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslation } from "@/lib/i18n/client";
import { rpc } from "@/server/rpc/client";

interface Version {
  id: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

/*
 * Version history strip on the result screen. Lists every render of a design
 * (first + regenerates) as thumbnails; clicking one makes it the active image.
 * Refreshes after regenerate (the `refreshKey` prop bumps to refetch).
 */
export function VersionHistory({ designId, refreshKey }: { designId: string; refreshKey: number }) {
  const { dict } = useTranslation();
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [switching, startSwitch] = useTransition();

  useEffect(() => {
    let alive = true;
    rpc.design.versions({ designId }).then((v) => {
      if (alive) setVersions(v as Version[]);
    });
    return () => {
      alive = false;
    };
  }, [designId, refreshKey]);

  // Only show the strip once there is more than one version to compare.
  if (versions.length < 2) return null;

  function activate(versionId: string) {
    // Optimistic: highlight the clicked thumbnail immediately, then persist +
    // refresh the main image. Without this the isActive highlight would lag.
    setVersions((prev) => prev.map((v) => ({ ...v, isActive: v.id === versionId })));
    startSwitch(async () => {
      await rpc.design.activateVersion({ designId, versionId });
      const fresh = await rpc.design.versions({ designId });
      setVersions(fresh as Version[]);
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <div className="mb-2 font-semibold text-brand-body text-sm">{dict.result.versions}</div>
      {/* px/py padding so the active thumbnail's ring-offset isn't clipped by overflow. */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1.5">
        {versions.map((v, i) => (
          <button
            type="button"
            key={v.id}
            onClick={() => activate(v.id)}
            disabled={switching}
            aria-label={`Version ${versions.length - i}`}
            aria-pressed={v.isActive}
            title={v.isActive ? "Current version" : "Switch to this version"}
            className={`relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-2 transition-all hover:scale-[1.03] disabled:cursor-wait ${
              v.isActive
                ? "ring-primary ring-offset-2 ring-offset-background"
                : "opacity-70 ring-transparent hover:opacity-100 hover:ring-border"
            }`}
          >
            <Image src={v.imageUrl} alt="" fill sizes="64px" className="object-cover" />
            {v.isActive && (
              <span className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Check className="size-2.5" />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
