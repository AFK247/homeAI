"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/config/pages";
import { resetPassword } from "@/lib/auth/client";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Sets a new password using the one-time token from the emailed link (?token=). If Better
 * Auth redirected here with ?error= (expired/invalid token), there's nothing to reset —
 * show that and point back to /forgot-password. Built on the form factory; the confirm-match
 * rule lives in the schema so it renders inline under the confirm field.
 */
export function ResetPasswordForm({ dict }: { dict: Dictionary["resetPassword"] }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [pending, start] = useTransition();

  const schema = z
    .object({
      password: z.string().min(8),
      confirm: z.string().min(8),
    })
    .refine((v) => v.password === v.confirm, {
      message: dict.mismatch,
      path: ["confirm"],
    });
  type Values = z.infer<typeof schema>;

  if (linkError || !token) {
    return (
      <p className="rounded-2xl bg-card p-5 text-center text-destructive text-sm shadow-sm">
        {dict.invalidToken}
      </p>
    );
  }

  function onSubmit({ password }: Values) {
    start(async () => {
      // token is guaranteed non-null here (guarded above), assert for the type.
      const res = await resetPassword({ newPassword: password, token: token as string });
      if (res.error) {
        toast.error(res.error.message || dict.invalidToken);
        return;
      }
      toast.success(dict.success);
      router.push(PAGES.LOGIN);
    });
  }

  const fields: FieldConfig<Values>[] = [
    { name: "password", label: dict.newPassword, type: "password", isRequired: true },
    { name: "confirm", label: dict.confirmPassword, type: "password", isRequired: true },
  ];

  return (
    <FormFactory schema={schema} defaultValues={{ password: "", confirm: "" }} onSubmit={onSubmit}>
      <FieldFactory fields={fields} />
      <Button size="lg" type="submit" disabled={pending} className="w-full">
        {pending ? dict.saving : dict.submit}
      </Button>
    </FormFactory>
  );
}
