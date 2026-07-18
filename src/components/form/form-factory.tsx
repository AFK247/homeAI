"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type DefaultValues,
  type FieldValues,
  FormProvider,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { cn } from "@/lib/utils";

/*
 * FormFactory — the form wrapper (ported from the reference). Owns useForm with a
 * zodResolver + defaultValues, provides the RHF context to any FieldFactory/Field* inside,
 * and wires submit through handleSubmit. Field-level errors render inline under their
 * inputs; a submit that fails validation with no field message is toasted.
 *
 * The same Zod schema is used here (client) and by the oRPC procedure (server).
 */

/** First human-readable message anywhere in the RHF errors tree (skips DOM refs). */
function findFirstErrorMessage(node: unknown): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.length > 0) return record.message;
  for (const [key, value] of Object.entries(record)) {
    if (key === "ref" || key === "message") continue;
    const msg = findFirstErrorMessage(value);
    if (msg) return msg;
  }
  return undefined;
}

interface FormFactoryProps<TFieldValues extends FieldValues> {
  id?: string;
  className?: string;
  // biome-ignore lint/suspicious/noExplicitAny: zod input/output generics vary per schema
  schema: z.ZodType<TFieldValues, any, any>;
  defaultValues?: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: React.ReactNode;
}

export function FormFactory<TFieldValues extends FieldValues>({
  id,
  className,
  schema,
  defaultValues,
  onSubmit,
  children,
}: FormFactoryProps<TFieldValues>) {
  const methods = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        noValidate
        autoComplete="off"
        className={cn("flex flex-col gap-5", className)}
        onSubmit={methods.handleSubmit(onSubmit, (errors) => {
          // Field errors already show inline; only toast when none carry a message.
          if (!findFirstErrorMessage(errors)) toast.error("Please fix the form and try again.");
        })}
      >
        {children}
      </form>
    </FormProvider>
  );
}
