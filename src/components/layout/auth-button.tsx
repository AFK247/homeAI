"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PAGES } from "@/config/pages";
import { authClient, useSession } from "@/lib/auth/client";
import { useTranslation } from "@/lib/i18n/client";

/*
 * Header auth control. Signed out → a Login link. Signed in → the user's first name + a
 * logout button. Client component (reads the live session). Login is optional app-wide.
 */
export function AuthButton() {
  const { dict } = useTranslation();
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [loggingOut, startLogout] = useTransition();

  if (isPending) return <span className="h-5 w-12 animate-pulse rounded bg-muted" />;

  if (!session?.user) {
    return (
      <Link href={PAGES.LOGIN} className="font-bold text-primary text-sm">
        {dict.common.login}
      </Link>
    );
  }

  const firstName = session.user.name?.split(" ")[0] ?? session.user.email;

  return (
    <div className="flex items-center gap-3">
      <span className="hidden font-semibold text-foreground text-sm sm:inline">{firstName}</span>
      <button
        type="button"
        disabled={loggingOut}
        onClick={() =>
          startLogout(async () => {
            await authClient.signOut();
            router.refresh();
          })
        }
        className="flex items-center gap-1 font-medium text-brand-body text-sm hover:text-foreground"
        title={dict.login.logout}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">{dict.login.logout}</span>
      </button>
    </div>
  );
}
