"use client";

import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/config/pages";
import { authClient, useSession } from "@/lib/auth/client";
import { useTranslation } from "@/lib/i18n/client";

/*
 * Header auth control. Signed out → a Login link. Signed in → an avatar button that opens a
 * dropdown with the user's name/email, Profile, an Admin shortcut (admins only) and Log out.
 * Client component (reads the live session). Login is optional app-wide.
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

  const { name, email } = session.user;
  const firstName = name?.split(" ")[0] ?? email;
  const isAdmin = (session.user as { role?: string }).role === "admin";

  function logout() {
    startLogout(async () => {
      await authClient.signOut();
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={dict.account.accountLink}
          className="group flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold text-foreground text-sm transition-colors outline-none hover:bg-muted"
        >
          {firstName}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate font-semibold text-foreground">{name || firstName}</span>
          <span className="truncate font-normal text-muted-foreground text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={PAGES.ACCOUNT}>
            <User />
            {dict.account.accountLink}
          </Link>
        </DropdownMenuItem>

        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={PAGES.ADMIN.INDEX}>
              <LayoutDashboard />
              {dict.account.adminDashboard}
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" disabled={loggingOut} onSelect={logout}>
          <LogOut />
          {dict.login.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
