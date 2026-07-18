"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/config/pages";
import { authClient } from "@/lib/auth/client";

/*
 * Login form (Stage D). Facebook + Google (BD audience) + email/password, wired to Better
 * Auth via the form factory. On success, returns to `?next=` (or home). Login is OPTIONAL
 * app-wide — this screen is reached from the header or when an admin route requires it.
 *
 * One schema covers both modes: `name` is optional (only shown/used when signing up). Mode
 * drives which fields the FieldFactory renders; the social buttons, submit, forgot-password
 * link and mode toggle are custom chrome rendered as siblings inside the FormFactory.
 */

const LoginSchema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(8),
});
type LoginValues = z.infer<typeof LoginSchema>;

export function LoginForm({ dict }: { dict: LoginDict }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || PAGES.HOME;
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  function social(provider: "google" | "facebook") {
    start(async () => {
      await authClient.signIn.social({ provider, callbackURL: next });
    });
  }

  function onSubmit({ name, email, password }: LoginValues) {
    start(async () => {
      const res =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              email,
              password,
              name: name || email.split("@")[0] || email,
            });
      if (res.error) {
        toast.error(res.error.message || "Could not sign in.");
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  const fields: FieldConfig<LoginValues>[] = [
    ...(mode === "signup"
      ? [{ name: "name", label: dict.name, type: "text" } as FieldConfig<LoginValues>]
      : []),
    {
      name: "email",
      label: dict.email,
      type: "email",
      placeholder: "you@example.com",
      isRequired: true,
    },
    { name: "password", label: dict.password, type: "password", isRequired: true },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => social("facebook")}
          className="w-full gap-2.5"
        >
          <FacebookIcon />
          {dict.facebook}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={() => social("google")}
          className="w-full gap-2.5"
        >
          <GoogleIcon />
          {dict.google}
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-brand-faint text-xs">
        <span className="h-px flex-1 bg-border" /> {dict.or}{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <FormFactory
        schema={LoginSchema}
        defaultValues={{ name: "", email: "", password: "" }}
        onSubmit={onSubmit}
      >
        <FieldFactory fields={fields} />
        {mode === "signin" ? (
          <Link
            href={PAGES.FORGOT_PASSWORD}
            className="-mt-2 self-end text-primary text-xs hover:underline"
          >
            {dict.forgotPassword}
          </Link>
        ) : null}
        <Button size="lg" type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "…" : mode === "signin" ? dict.continue : dict.createAccount}
        </Button>
      </FormFactory>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="mt-4 w-full text-center text-primary text-sm hover:underline"
      >
        {mode === "signin" ? dict.needAccount : dict.haveAccount}
      </button>
    </>
  );
}

/* Brand marks — official multicolor Google "G" and Facebook "f". */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

export interface LoginDict {
  facebook: string;
  google: string;
  or: string;
  name: string;
  email: string;
  password: string;
  continue: string;
  createAccount: string;
  needAccount: string;
  haveAccount: string;
  forgotPassword: string;
}
