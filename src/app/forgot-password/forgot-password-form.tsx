"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGES } from "@/config/pages";
import { requestPasswordReset } from "@/lib/auth/client";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Requests a password-reset email. `redirectTo` tells Better Auth where the emailed link
 * should point — our /reset-password page, which reads the appended ?token=. We always show
 * the neutral "sent" message (never reveal whether the email exists).
 */
export function ForgotPasswordForm({ dict }: { dict: Dictionary["forgotPassword"] }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await requestPasswordReset({ email, redirectTo: PAGES.RESET_PASSWORD });
      if (res.error) {
        toast.error(res.error.message || dict.sent);
        return;
      }
      setSent(true);
      toast.success(dict.sent);
    });
  }

  if (sent) {
    return <p className="rounded-2xl bg-card p-5 text-center text-sm shadow-sm">{dict.sent}</p>;
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{dict.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
      </div>
      <Button size="lg" type="submit" disabled={pending} className="w-full">
        {pending ? dict.sending : dict.submit}
      </Button>
    </form>
  );
}
