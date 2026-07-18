import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { getDictionary } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

/*
 * Auth screen. Facebook + Google (BD audience) + email/password, wired to Better Auth.
 * Login is OPTIONAL app-wide — reached from the header or an admin route that needs it.
 */
export default async function LoginPage() {
  const { dict } = await getDictionary();
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size="lg" withWordmark={false} />
          <h1 className="font-serif font-extrabold text-2xl text-foreground">{dict.login.title}</h1>
          <p className="text-brand-body text-sm">{dict.login.subtitle}</p>
        </div>

        <Suspense>
          <LoginForm dict={dict.login} />
        </Suspense>

        <p className="mt-6 text-center text-brand-faint text-xs">
          {dict.login.termsPrefix}
          <Link href="#" className="text-primary">
            {dict.login.termsLink}
          </Link>
          {dict.login.termsSuffix}
        </p>
      </div>
    </main>
  );
}
