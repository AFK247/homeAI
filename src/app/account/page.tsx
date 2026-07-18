import { redirect } from "next/navigation";
import { PAGES } from "@/config/pages";
import { getCurrentUser, hasPasswordCredential } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";
import { AccountForm } from "./account-form";

/*
 * Shared account/profile page for ALL signed-in users (admins included — an admin is just a
 * user with role=admin). Server-gated: anonymous visitors are bounced to login. Fetches the
 * bits the client form can't derive on its own (whether the user has a password credential,
 * so social-only users don't see a change-password box) and hands off to the client form.
 */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`${PAGES.LOGIN}?next=${PAGES.ACCOUNT}`);

  const { dict } = await getDictionary();
  const canChangePassword = await hasPasswordCredential(user.id);
  const role = (user as { role?: string }).role ?? "user";

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <div className="mb-8">
        <h1 className="font-serif font-extrabold text-2xl text-foreground">{dict.account.title}</h1>
        <p className="mt-1 text-brand-body text-sm">{dict.account.subtitle}</p>
      </div>

      <AccountForm
        dict={dict.account}
        initialName={user.name ?? ""}
        email={user.email}
        role={role}
        canChangePassword={canChangePassword}
      />
    </main>
  );
}
