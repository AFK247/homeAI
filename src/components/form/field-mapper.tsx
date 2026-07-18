"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import type { SelectOption } from "@/components/ui/native-select";
import {
  FieldCheckbox,
  FieldDate,
  FieldInput,
  FieldMultiSelect,
  FieldNumber,
  FieldRadio,
  FieldSelect,
  FieldSwitch,
  FieldTextarea,
} from "./field-builder";

/*
 * FieldConfig — the declarative field description (a discriminated union on `type`), and
 * FieldMapper — the dispatcher that renders the matching Field* component. Ported from the
 * reference form-builder; scoped to the field types this app supports natively (no
 * react-select / dropzone / field-arrays).
 *
 * To add a field type: add a variant to FieldConfig and a case to FieldMapper.
 */

interface BaseFieldConfig<TName> {
  name: TName;
  label?: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  isRequired?: boolean;
  disabled?: boolean;
  className?: string;
  /** Side-effect after a value change. */
  callback?: (value: unknown) => void;
  /** Injected by FieldFactory — do not set manually. */
  _layout?: "horizontal" | "vertical";
}

export type FieldConfig<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = BaseFieldConfig<TName> &
  (
    | { type: "text" | "email" | "password"; inputFilter?: (v: string) => string }
    | { type: "number"; min?: number; max?: number; step?: number }
    | { type: "textarea"; rows?: number }
    | { type: "select"; options: SelectOption[] }
    | { type: "multiselect"; options: SelectOption[] }
    | { type: "radio"; options: SelectOption[] }
    | { type: "checkbox"; checkboxLabel?: React.ReactNode }
    | { type: "switch" }
    | { type: "date" }
  );

export function FieldMapper<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ field, control }: { field: FieldConfig<TFieldValues, TName>; control: Control<TFieldValues> }) {
  // Common props every Field* accepts. `control` is typed loosely here since the union is
  // resolved per-case below.
  const common = {
    name: field.name,
    label: field.label,
    description: field.description,
    isRequired: field.isRequired,
    disabled: field.disabled,
    className: field.className,
    callback: field.callback,
    _layout: field._layout,
    // biome-ignore lint/suspicious/noExplicitAny: control type unifies across field variants
    control: control as any,
  };

  switch (field.type) {
    case "text":
    case "email":
    case "password":
      return (
        <FieldInput
          {...common}
          type={field.type}
          placeholder={field.placeholder}
          inputFilter={field.inputFilter}
        />
      );
    case "number":
      return (
        <FieldNumber
          {...common}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );
    case "textarea":
      return <FieldTextarea {...common} placeholder={field.placeholder} rows={field.rows} />;
    case "select":
      return <FieldSelect {...common} options={field.options} placeholder={field.placeholder} />;
    case "multiselect":
      return <FieldMultiSelect {...common} options={field.options} />;
    case "radio":
      return <FieldRadio {...common} options={field.options} />;
    case "checkbox":
      return <FieldCheckbox {...common} checkboxLabel={field.checkboxLabel} />;
    case "switch":
      return <FieldSwitch {...common} />;
    case "date":
      return <FieldDate {...common} />;
    default:
      return null;
  }
}
