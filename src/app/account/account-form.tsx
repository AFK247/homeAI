"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { type FieldConfig, FieldFactory, FormFactory } from "@/components/form";
import { Button } from "@/components/ui/button";
import { changePassword, revokeOtherSessions, updateUser } from "@/lib/auth/client";
import type { Dictionary } from "@/lib/i18n/types";

/*
 * Account management form. Three independent sections, each its own form-factory instance +
 * pending state so one failing doesn't block the others:
 *   1. Profile  — change display name (all users)
 *   2. Password — change password (email/password users only; hidden for social-only)
 *   3. Security — sign out of all other devices
 * Email + role are read-only display, rendered as chrome alongside the factory fields. On
 * name change we router.refresh() so the header reflects it.
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

/** Submit button that disables itself while the form is pristine (reads RHF context). */
function DirtyAwareSubmit({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: string;
  busy: string;
}) {
  const {
    formState: { isDirty },
  } = useFormContext();
  return (
    <Button type="submit" disabled={pending || !isDirty} className="w-fit">
      {pending ? busy : idle}
    </Button>
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
  const [pending, start] = useTransition();

  const schema = z.object({ name: z.string().min(1) });
  type Values = z.infer<typeof schema>;

  function onSubmit({ name }: Values) {
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

  const fields: FieldConfig<Values>[] = [
    { name: "name", label: dict.nameLabel, type: "text", isRequired: true },
  ];

  return (
    <Section title={dict.profileHeading}>
      <FormFactory schema={schema} defaultValues={{ name: initialName }} onSubmit={onSubmit}>
        <FieldFactory fields={fields} />
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground text-sm">{dict.emailLabel}</span>
          <span className="text-muted-foreground text-sm">{email}</span>
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
        <DirtyAwareSubmit pending={pending} idle={dict.saveName} busy={dict.saving} />
      </FormFactory>
    </Section>
  );
}

function PasswordSection({ dict }: { dict: AccountDict }) {
  const [pending, start] = useTransition();
  // Bump to remount the FormFactory (clearing all fields) after a successful change.
  const [formKey, setFormKey] = useState(0);

  const schema = z
    .object({
      current: z.string().min(1),
      next: z.string().min(8),
      confirm: z.string().min(8),
    })
    .refine((v) => v.next === v.confirm, {
      message: dict.passwordMismatch,
      path: ["confirm"],
    });
  type Values = z.infer<typeof schema>;

  function onSubmit({ current, next }: Values) {
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
      setFormKey((k) => k + 1); // remount → clears the password fields
    });
  }

  const fields: FieldConfig<Values>[] = [
    { name: "current", label: dict.currentPassword, type: "password", isRequired: true },
    { name: "next", label: dict.newPassword, type: "password", isRequired: true },
    { name: "confirm", label: dict.confirmPassword, type: "password", isRequired: true },
  ];

  return (
    <Section title={dict.passwordHeading}>
      <FormFactory
        key={formKey}
        schema={schema}
        defaultValues={{ current: "", next: "", confirm: "" }}
        onSubmit={onSubmit}
      >
        <FieldFactory fields={fields} />
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? dict.saving : dict.changePassword}
        </Button>
      </FormFactory>
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
