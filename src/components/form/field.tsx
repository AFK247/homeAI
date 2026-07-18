import { cn } from "@/lib/utils";

/*
 * Field layout primitives (ported from the reference form-builder's @workspace/ui field).
 * FormBase composes these: a Field row, a label area, and a content area holding the
 * control + error. Kept intentionally small — just the layout pieces the factory needs.
 */

export function Field({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { "data-invalid"?: boolean }) {
  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function FieldContent({ className, children }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function FieldLabel({ className, children, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed by the caller
    <label
      data-slot="field-label"
      className={cn("font-medium text-foreground text-sm", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldDescription({ className, children }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-xs", className)}>{children}</p>;
}
