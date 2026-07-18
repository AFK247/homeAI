"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, revokeOtherSessions, updateUser } from "@/lib/auth/client";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Account management form. Three independent sections, each with its own submit + pending
 * state so one failing doesn't block the others:
 *   1. Profile  — change display name (all users)
 *   2. Password — change password (email/password users only; hidden for social-only)
 *   3. Security — sign out of all other devices
 * Email + role are read-only. On name change we router.refresh() so the header reflects it.
 */

type AccountDict = Dictionary["account"];

export function AccountForm({
  dict,
  initialName,
  email,
  role,
  canChangePassword,
}: {
  dict: AccountDict;
  initialName: string;
  email: string;
  role: string;
  canChangePassword: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <ProfileSection dict={dict} initialName={initialName} email={email} role={role} />
      {canChangePassword ? (
        <PasswordSection dict={dict} />
      ) : (
        <Section title={dict.passwordHeading}>
          <p className="text-muted-foreground text-sm">{dict.socialNoPassword}</p>
        </Section>
      )}
      <SecuritySection dict={dict} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-serif font-bold text-foreground text-lg">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSection({
  dict,
  initialName,
  email,
  role,
}: {
  dict: AccountDict;
  initialName: string;
  email: string;
  role: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateUser({ name });
      if (res.error) {
        toast.error(res.error.message || dict.genericError);
        return;
      }
      toast.success(dict.nameUpdated);
      router.refresh(); // header greeting reflects the new name
    });
  }

  return (
    <Section title={dict.profileHeading}>
      <form className="flex flex-col gap-4" onSubmit={save}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{dict.nameLabel}</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{dict.emailLabel}</Label>
          <Input id="email" value={email} disabled readOnly />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground text-sm">{dict.roleLabel}</span>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 font-semibold text-xs ${
              role === "admin"
                ? "bg-secondary text-secondary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {role === "admin" ? dict.roleAdmin : dict.roleUser}
          </span>
        </div>
        <Button type="submit" disabled={pending || name === initialName} className="w-fit">
          {pending ? dict.saving : dict.saveName}
        </Button>
      </form>
    </Section>
  );
}

function PasswordSection({ dict }: { dict: AccountDict }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      toast.error(dict.passwordMismatch);
      return;
    }
    start(async () => {
      const res = await changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true, // security: log out other devices after a password change
      });
      if (res.error) {
        toast.error(res.error.message || dict.genericError);
        return;
      }
      toast.success(dict.passwordChanged);
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <Section title={dict.passwordHeading}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current">{dict.currentPassword}</Label>
          <Input
            id="current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new">{dict.newPassword}</Label>
          <Input
            id="new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
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
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? dict.saving : dict.changePassword}
        </Button>
      </form>
    </Section>
  );
}

function SecuritySection({ dict }: { dict: AccountDict }) {
  const [pending, start] = useTransition();

  function signOutOthers() {
    start(async () => {
      const res = await revokeOtherSessions();
      if (res.error) {
        toast.error(res.error.message || dict.genericError);
        return;
      }
      toast.success(dict.signedOutOthers);
    });
  }

  return (
    <Section title={dict.sessionsHeading}>
      <Button type="button" variant="outline" disabled={pending} onClick={signOutOthers}>
        {pending ? dict.saving : dict.signOutOthers}
      </Button>
    </Section>
  );
}
