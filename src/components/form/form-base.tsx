"use client";

import {
  Controller,
  type ControllerProps,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./field";
import { FieldError } from "./field-error";

/*
 * FormBase — the heart of the ported form-builder. Wraps react-hook-form's Controller and
 * hands the field's `{ value, onChange, onBlur, ref, name }` plus injected extras to a
 * render-prop child, then lays out label + control + inline error.
 *
 * Layout mirrors the reference: `horizontal` (label left / input right, the default) or
 * `vertical` (label on top). Every Field* component builds on this so they all share the
 * same RHF wiring and error handling.
 */

export type FieldRenderProps = ControllerRenderProps &
  Record<string, unknown> & {
    id: string;
    "aria-invalid": boolean;
    callback?: (value: unknown) => void;
  };

export interface FormBaseProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName;
  label?: React.ReactNode;
  description?: React.ReactNode;
  control: ControllerProps<TFieldValues, TName>["control"];
  isRequired?: boolean;
  disabled?: boolean;
  className?: string;
  /** Fires after a value change, for side effects. */
  callback?: (value: unknown) => void;
  /** Layout from FieldFactory. */
  _layout?: "horizontal" | "vertical";
  /** Render just the control (no label wrapper). */
  _hideLabel?: boolean;
  children: (field: FieldRenderProps) => React.ReactNode;
}

export function FormBase<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  description,
  control,
  isRequired,
  className,
  callback,
  _layout = "horizontal",
  _hideLabel,
  children,
}: FormBaseProps<TFieldValues, TName>) {
  const isVertical = _layout === "vertical";

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const controlEl = children({
          ...field,
          id: field.name,
          "aria-invalid": fieldState.invalid,
          callback,
        } as FieldRenderProps);

        const errorEl = fieldState.invalid ? (
          <FieldError className="mt-1" error={fieldState.error?.message} />
        ) : null;

        const labelEl = (
          <>
            <FieldLabel htmlFor={field.name}>
              {label} {isRequired ? <span className="text-destructive">*</span> : null}
            </FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
          </>
        );

        if (_hideLabel) {
          return (
            <>
              {controlEl}
              {errorEl}
            </>
          );
        }

        if (isVertical) {
          return (
            <Field className={cn("gap-1.5", className)} data-invalid={fieldState.invalid}>
              {labelEl}
              <FieldContent className="gap-1">
                {controlEl}
                {errorEl}
              </FieldContent>
            </Field>
          );
        }

        // Horizontal (default): label left, control right.
        return (
          <Field
            className={cn("grid grid-cols-12 items-start gap-4", className)}
            data-invalid={fieldState.invalid}
          >
            <FieldContent className="col-span-5 pt-1.5">{labelEl}</FieldContent>
            <FieldContent className="col-span-7 gap-1">
              {controlEl}
              {errorEl}
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}
