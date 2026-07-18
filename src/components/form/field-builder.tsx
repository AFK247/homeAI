"use client";

import type { FieldPath, FieldValues } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, type SelectOption } from "@/components/ui/native-select";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FormBase, type FormBaseProps } from "./form-base";

/*
 * Individual field components (ported from the reference form-builder's field-builder).
 * Each wraps FormBase (which owns the RHF Controller) and renders one input type. They all
 * share the same signature so FieldMapper can dispatch to them uniformly.
 */

type FieldProps<TExtra = unknown> = Omit<FormBaseProps, "children"> & TExtra;

// ── Text / email / password ─────────────────────────────────────────────
export function FieldInput({
  type,
  placeholder,
  inputFilter,
  ...props
}: FieldProps<{ type?: string; placeholder?: string; inputFilter?: (v: string) => string }>) {
  // Password fields get the reveal/hide toggle; everything else is a plain Input.
  const InputComponent = type === "password" ? PasswordInput : Input;
  return (
    <FormBase {...props}>
      {({ callback, onChange, value, ...field }) => (
        <InputComponent
          {...(type === "password" ? {} : { type: type ?? "text" })}
          placeholder={placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => {
            const v = inputFilter ? inputFilter(e.target.value) : e.target.value;
            onChange(v);
            callback?.(v);
          }}
          {...fieldRest(field)}
        />
      )}
    </FormBase>
  );
}

// ── Number ──────────────────────────────────────────────────────────────
export function FieldNumber({
  placeholder,
  min,
  max,
  step,
  ...props
}: FieldProps<{ placeholder?: string; min?: number; max?: number; step?: number }>) {
  return (
    <FormBase {...props}>
      {({ callback, onChange, value, ...field }) => (
        <Input
          type="number"
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          value={value === null || value === undefined ? "" : (value as number)}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : e.target.valueAsNumber;
            onChange(v);
            callback?.(v);
          }}
          {...fieldRest(field)}
        />
      )}
    </FormBase>
  );
}

// ── Textarea ────────────────────────────────────────────────────────────
export function FieldTextarea({
  placeholder,
  rows,
  ...props
}: FieldProps<{ placeholder?: string; rows?: number }>) {
  return (
    <FormBase {...props}>
      {({ callback, onChange, value, ...field }) => (
        <Textarea
          placeholder={placeholder}
          rows={rows}
          value={(value as string) ?? ""}
          onChange={(e) => {
            onChange(e.target.value);
            callback?.(e.target.value);
          }}
          {...fieldRest(field)}
        />
      )}
    </FormBase>
  );
}

// ── Select (single) ─────────────────────────────────────────────────────
export function FieldSelect({
  options,
  placeholder,
  ...props
}: FieldProps<{ options: SelectOption[]; placeholder?: string }>) {
  return (
    <FormBase {...props}>
      {({ callback, onChange, value, ...field }) => (
        <NativeSelect
          options={options}
          placeholder={placeholder}
          value={(value as string) ?? ""}
          onChange={(v) => {
            onChange(v);
            callback?.(v);
          }}
          {...fieldRest(field)}
        />
      )}
    </FormBase>
  );
}

// ── Multiselect (chip picker) ───────────────────────────────────────────
export function FieldMultiSelect({ options, ...props }: FieldProps<{ options: SelectOption[] }>) {
  return (
    <FormBase {...props}>
      {({ onChange, value }) => {
        const selected = (Array.isArray(value) ? value : []) as string[];
        const toggle = (v: string) =>
          onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
        return (
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-brand-body hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        );
      }}
    </FormBase>
  );
}

// ── Radio group ─────────────────────────────────────────────────────────
export function FieldRadio({ options, ...props }: FieldProps<{ options: SelectOption[] }>) {
  return (
    <FormBase {...props}>
      {({ onChange, value, callback }) => (
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={value === o.value}
                onChange={() => {
                  onChange(o.value);
                  callback?.(o.value);
                }}
                className="size-4"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </FormBase>
  );
}

// ── Checkbox (single boolean) ───────────────────────────────────────────
export function FieldCheckbox({
  checkboxLabel,
  ...props
}: FieldProps<{ checkboxLabel?: React.ReactNode }>) {
  return (
    <FormBase {...props}>
      {({ onChange, value, callback, id }) => (
        <label className="flex items-center gap-2 text-sm" htmlFor={id}>
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(c) => {
              onChange(c);
              callback?.(c);
            }}
          />
          {checkboxLabel}
        </label>
      )}
    </FormBase>
  );
}

// ── Switch (boolean toggle) ─────────────────────────────────────────────
export function FieldSwitch(props: FieldProps) {
  return (
    <FormBase {...props}>
      {({ onChange, value, callback, id }) => (
        <Switch
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(c) => {
            onChange(c);
            callback?.(c);
          }}
        />
      )}
    </FormBase>
  );
}

// ── Date (native date input) ────────────────────────────────────────────
export function FieldDate({ ...props }: FieldProps) {
  return (
    <FormBase {...props}>
      {({ callback, onChange, value, ...field }) => (
        <Input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => {
            onChange(e.target.value || null);
            callback?.(e.target.value);
          }}
          {...fieldRest(field)}
        />
      )}
    </FormBase>
  );
}

/** Strip the render-prop-only keys so the rest can spread onto a DOM input. */
function fieldRest(field: Record<string, unknown>) {
  const { callback: _c, "aria-invalid": ariaInvalid, ref, onBlur, disabled, id } = field;
  return {
    ref: ref as React.Ref<HTMLInputElement & HTMLTextAreaElement>,
    onBlur: onBlur as () => void,
    disabled: disabled as boolean | undefined,
    id: id as string,
    "aria-invalid": ariaInvalid as boolean,
  };
}

export type { FieldPath, FieldValues };
