"use client";

import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BudgetTier, DesignStyle, RoomType } from "@/db/schemas/shared.schema";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  BudgetControl,
  PromptControl,
  RoomControl,
  StyleControl,
} from "./controls/design-controls";

/*
 * DesignWorkspace — the shared two-column shell for BOTH the create and result routes so
 * the design controls (room / style / budget / prompt) stay visible next to the image and
 * can be tweaked before (re)generating. Presentation only: the parent supplies values,
 * setters, the canvas content, anything below the canvas, and the primary action.
 *
 * Responsive: desktop/tablet = controls left (sticky) + canvas right; mobile = canvas
 * first, controls in a collapsible accordion below (collapsed by default) so the image
 * gets full width.
 */

export interface DesignWorkspaceValues {
  roomType: RoomType;
  style: DesignStyle;
  budget: BudgetTier;
  prompt: string;
}

export interface DesignWorkspaceProps {
  values: DesignWorkspaceValues;
  onChange: {
    roomType: (v: RoomType) => void;
    style: (v: DesignStyle) => void;
    budget: (v: BudgetTier) => void;
    prompt: (v: string) => void;
  };
  /** Read-only while a (re)generation is in flight. */
  controlsDisabled?: boolean;
  /** The main image / result area. */
  canvas: React.ReactNode;
  /** Content under the canvas — furniture list, version history (result only). */
  belowCanvas?: React.ReactNode;
  primaryAction: {
    label: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick: () => void;
  };
  /** Optional helper/error line under the primary button. */
  actionNote?: React.ReactNode;
}

function Controls({
  values,
  onChange,
  disabled,
}: Pick<DesignWorkspaceProps, "values" | "onChange"> & { disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <RoomControl value={values.roomType} onChange={onChange.roomType} disabled={disabled} />
      <StyleControl value={values.style} onChange={onChange.style} disabled={disabled} />
      <BudgetControl value={values.budget} onChange={onChange.budget} disabled={disabled} />
      <PromptControl value={values.prompt} onChange={onChange.prompt} disabled={disabled} />
    </div>
  );
}

function PrimaryButton({
  primaryAction,
  actionNote,
}: Pick<DesignWorkspaceProps, "primaryAction" | "actionNote">) {
  return (
    <div>
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={primaryAction.disabled}
        onClick={primaryAction.onClick}
      >
        {primaryAction.loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {primaryAction.label}
      </Button>
      {actionNote ? <div className="mt-2 text-center text-xs">{actionNote}</div> : null}
    </div>
  );
}

export function DesignWorkspace(props: DesignWorkspaceProps) {
  const { dict } = useTranslation();
  const { values, onChange, controlsDisabled, canvas, belowCanvas, primaryAction } = props;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
      {/* Canvas + below-canvas content (left column). On mobile this comes first. */}
      <div className="flex flex-col gap-5">
        {canvas}

        {/* Mobile: primary action right under the image, then a collapsible controls panel. */}
        <div className="lg:hidden">
          <PrimaryButton primaryAction={primaryAction} actionNote={props.actionNote} />
        </div>
        <div className="rounded-2xl bg-card shadow-sm lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left font-bold text-foreground text-sm"
          >
            {dict.style.title} · {dict.upload.roomType}
            <ChevronDown
              className={cn("size-4 transition-transform", mobileOpen && "rotate-180")}
            />
          </button>
          {mobileOpen ? (
            <div className="border-border border-t px-5 pt-4 pb-5">
              <Controls values={values} onChange={onChange} disabled={controlsDisabled} />
            </div>
          ) : null}
        </div>

        {belowCanvas}
      </div>

      {/* Controls — desktop/tablet: sticky right column. Hidden on mobile (accordion above). */}
      <aside className="hidden flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm lg:sticky lg:top-6 lg:flex">
        <Controls values={values} onChange={onChange} disabled={controlsDisabled} />
        <PrimaryButton primaryAction={primaryAction} actionNote={props.actionNote} />
      </aside>
    </div>
  );
}
