"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGES } from "@/config/pages";
import { resetPassword } from "@/lib/auth/client";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Sets a new password using the one-time token from the emailed link (?token=). If Better
 * Auth redirected here with ?error= (expired/invalid token), there's nothing to reset —
 * show that and point back to /forgot-password.
 */
export function ResetPasswordForm({ dict }: { dict: Dictionary["resetPassword"] }) {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  if (linkError || !token) {
    return (
      <p className="rounded-2xl bg-card p-5 text-center text-destructive text-sm shadow-sm">
        {dict.invalidToken}
      </p>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(dict.mismatch);
      return;
    }
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

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new">{dict.newPassword}</Label>
        <Input
          id="new"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">{dict.confirmPassword}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <Button size="lg" type="submit" disabled={pending} className="w-full">
        {pending ? dict.saving : dict.submit}
      </Button>
    </form>
  );
}
