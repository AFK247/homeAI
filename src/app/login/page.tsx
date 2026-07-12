import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDictionary } from "@/lib/i18n/server";

/*
 * Auth screen (design). Facebook + Google prominent (BD audience), plus email/password.
 * Presentational for Stage C; Better Auth wired in Stage D.
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

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90">
            {dict.login.facebook}
          </Button>
          <Button size="lg" variant="outline" className="w-full">
            {dict.login.google}
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3 text-brand-faint text-xs">
          <span className="h-px flex-1 bg-border" /> {dict.login.or}{" "}
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{dict.login.email}</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{dict.login.password}</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <Button size="lg" className="mt-1 w-full">
            {dict.login.continue}
          </Button>
        </form>

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
