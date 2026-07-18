import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { getDictionary } from "@/lib/i18n/server";
import { ResetPasswordForm } from "./reset-password-form";

/*
 * Reset-password screen — the destination of the emailed link. Better Auth appends
 * ?token=... (valid) or ?error=... (expired/invalid) to the URL; the client form reads it
 * from the query. On success the user is sent to /login to sign in with the new password.
 */
export default async function ResetPasswordPage() {
  const { dict } = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" withWordmark={false} />
          <h1 className="font-serif font-extrabold text-2xl text-foreground">
            {dict.resetPassword.title}
          </h1>
          <p className="text-brand-body text-sm">{dict.resetPassword.subtitle}</p>
        </div>

        <Suspense>
          <ResetPasswordForm dict={dict.resetPassword} />
        </Suspense>

        <p className="mt-6 text-center text-sm">
          <Link href={PAGES.LOGIN} className="text-primary hover:underline">
            {dict.resetPassword.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
