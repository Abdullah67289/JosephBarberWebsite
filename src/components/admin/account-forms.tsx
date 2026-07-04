"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/admin/use-action";
import { updateOwnProfile, changeOwnPassword } from "@/server/account-actions";

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function AccountForms({
  initialName,
  initialEmail,
  role,
}: {
  initialName: string;
  initialEmail: string;
  role: string;
}) {
  const profile = useAction();
  const password = useAction();
  const [name, setName] = React.useState(initialName);
  const [email, setEmail] = React.useState(initialEmail);
  const [profileErrors, setProfileErrors] = React.useState<Record<string, string>>({});

  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pwErrors, setPwErrors] = React.useState<Record<string, string>>({});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your role is {role}. Only the owner can change roles.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setProfileErrors({});
            const res = await profile.run(() => updateOwnProfile({ name, email }), { success: "Profile updated." });
            if (!res.ok && res.fieldErrors) setProfileErrors(res.fieldErrors);
          }}
        >
          <Field label="Name" error={profileErrors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email" error={profileErrors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" loading={profile.busy}>Save profile</Button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPwErrors({});
            const res = await password.run(
              () => changeOwnPassword({ currentPassword: current, newPassword: next, confirmPassword: confirm }),
              { success: "Password changed.", onSuccess: () => { setCurrent(""); setNext(""); setConfirm(""); } },
            );
            if (!res.ok && res.fieldErrors) setPwErrors(res.fieldErrors);
          }}
        >
          <Field label="Current password" error={pwErrors.currentPassword}>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
          </Field>
          <Field label="New password" error={pwErrors.newPassword}>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Field label="Confirm new password" error={pwErrors.confirmPassword}>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Button type="submit" loading={password.busy}>Change password</Button>
        </form>
      </section>
    </div>
  );
}
