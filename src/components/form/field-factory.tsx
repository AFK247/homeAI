"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type FieldConfig, FieldMapper } from "./field-mapper";

export type { FieldConfig } from "./field-mapper";

/*
 * FieldFactory — the declarative form renderer (ported from the reference form-builder).
 * Give it a `fields` config array; it maps each through FieldMapper. Pulls `control` from
 * the surrounding FormProvider (or takes it explicitly). `variant` wraps in a Card or
 * renders plain; `columns` lays fields out in a responsive grid; `layout` is
 * horizontal (label left) or vertical (label on top).
 */

const GRID_COLS: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

interface FieldFactoryProps<TFieldValues extends FieldValues = FieldValues> {
  title?: string;
  description?: React.ReactNode;
  error?: React.ReactNode;
  action?: React.ReactNode;
  fields: FieldConfig<TFieldValues, FieldPath<TFieldValues>>[];
  control?: Control<TFieldValues>;
  layout?: "horizontal" | "vertical";
  variant?: "card" | "plain";
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function FieldFactory<TFieldValues extends FieldValues = FieldValues>({
  title,
  description,
  error,
  action,
  fields,
  control: controlProp,
  layout = "vertical",
  variant = "plain",
  columns = 1,
  className,
}: FieldFactoryProps<TFieldValues>) {
  const contextControl = useFormContext<TFieldValues>()?.control;
  const control = controlProp ?? contextControl;

  const fieldKey = (field: FieldConfig<TFieldValues, FieldPath<TFieldValues>>, i: number) =>
    "name" in field && field.name ? String(field.name) : `field-${i}`;

  const body = fields.map((field, i) => (
    <FieldMapper
      key={fieldKey(field, i)}
      field={{ ...field, _layout: layout }}
      control={control as Control<TFieldValues>}
    />
  ));

  const header =
    title || description || action || error ? (
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    ) : null;

  if (variant === "plain") {
    return (
      <div className={cn("grid gap-5", GRID_COLS[columns], className)}>
        {header}
        {body}
      </div>
    );
  }

  return (
    <Card className={className}>
      {title || description || action || error ? (
        <CardHeader>
          {title ? <CardTitle>{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("grid gap-5", GRID_COLS[columns])}>{body}</CardContent>
    </Card>
  );
}
