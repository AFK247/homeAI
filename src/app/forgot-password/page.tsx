import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PAGES } from "@/config/pages";
import { getDictionary } from "@/lib/i18n/server";
import { ForgotPasswordForm } from "./forgot-password-form";

/*
 * Forgot-password request screen. Collects an email and asks Better Auth to send a reset
 * link (delivered via Resend — see auth.ts sendResetPassword). Deliberately shows the same
 * "if an account exists…" message whether or not the email is registered, so it can't be
 * used to probe which emails have accounts.
 */
export default async function ForgotPasswordPage() {
  const { dict } = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" withWordmark={false} />
          <h1 className="font-serif font-extrabold text-2xl text-foreground">
            {dict.forgotPassword.title}
          </h1>
          <p className="text-brand-body text-sm">{dict.forgotPassword.subtitle}</p>
        </div>

        <ForgotPasswordForm dict={dict.forgotPassword} />

        <p className="mt-6 text-center text-sm">
          <Link href={PAGES.LOGIN} className="text-primary hover:underline">
            {dict.forgotPassword.backToLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
