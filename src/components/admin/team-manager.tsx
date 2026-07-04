"use client";

import * as React from "react";
import { UserPlus, Pencil, KeyRound, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAction } from "@/components/admin/use-action";
import { PERMISSIONS } from "@/lib/permissions";
import { createWorker, updateWorker, resetWorkerPassword, deleteWorker } from "@/server/user-admin-actions";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  staffId: string | null;
  lastLoginAt: string | null;
  permissions: string[];
};
type StaffOption = { id: string; name: string };

const WORKER_ROLES = ["ADMIN", "BARBER"] as const;

export function TeamManager({ members, staff }: { members: Member[]; staff: StaffOption[] }) {
  const [editing, setEditing] = React.useState<Member | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [resetting, setResetting] = React.useState<Member | null>(null);

  const workers = members.filter((m) => m.role !== "OWNER");
  const owner = members.find((m) => m.role === "OWNER");
  const linkedStaffIds = new Set(members.map((m) => m.staffId).filter(Boolean) as string[]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> Add worker
        </Button>
      </div>

      {owner && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4" /> Owner
          </div>
          <p className="mt-1 text-sm">
            {owner.name} · <span className="text-muted-foreground">{owner.email}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Full access to everything. Manage your own login from My Account.</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4 font-display text-lg font-semibold">Workers ({workers.length})</div>
        {workers.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No workers yet. Add one to give a staff member limited dashboard access.</p>
        ) : (
          <ul className="divide-y divide-border">
            {workers.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {m.name}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{m.role}</span>
                    {!m.isActive && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-destructive">Disabled</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.permissions.length} area{m.permissions.length === 1 ? "" : "s"} · last login {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleDateString() : "never"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(m)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setResetting(m)}><KeyRound className="h-3.5 w-3.5" /> Password</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <WorkerDialog staff={staff} linkedStaffIds={linkedStaffIds} onClose={() => setCreating(false)} />
      )}
      {editing && (
        <WorkerDialog member={editing} staff={staff} linkedStaffIds={linkedStaffIds} onClose={() => setEditing(null)} />
      )}
      {resetting && <ResetDialog member={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function PermissionGrid({ selected, onToggle }: { selected: Set<string>; onToggle: (k: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSIONS.map((p) => (
        <label key={p.key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 text-sm hover:border-primary/40">
          <input type="checkbox" checked={selected.has(p.key)} onChange={() => onToggle(p.key)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span className="font-medium">{p.label}</span>
            <span className="block text-xs text-muted-foreground">{p.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function WorkerDialog({
  member,
  staff,
  linkedStaffIds,
  onClose,
}: {
  member?: Member;
  staff: StaffOption[];
  linkedStaffIds: Set<string>;
  onClose: () => void;
}) {
  const { busy, run } = useAction();
  const isEdit = Boolean(member);
  const [name, setName] = React.useState(member?.name ?? "");
  const [email, setEmail] = React.useState(member?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<string>(member?.role && member.role !== "OWNER" ? member.role : "BARBER");
  const [isActive, setIsActive] = React.useState(member?.isActive ?? true);
  const [staffId, setStaffId] = React.useState<string>(member?.staffId ?? "");
  const [perms, setPerms] = React.useState<Set<string>>(new Set(member?.permissions ?? ["manage_bookings", "manage_schedule"]));
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const toggle = (k: string) => setPerms((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // Staff options: unlinked profiles plus this member's own current link.
  const staffOptions = staff.filter((s) => !linkedStaffIds.has(s.id) || s.id === member?.staffId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    const permissions = [...perms];
    const res = isEdit
      ? await run(() => updateWorker({ id: member!.id, name, role, isActive, staffId: staffId || null, permissions }), { success: "Worker updated.", onSuccess: onClose })
      : await run(() => createWorker({ name, email, password, role, staffId: staffId || null, permissions }), { success: "Worker added.", onSuccess: onClose });
    if (!res.ok && res.fieldErrors) setErrors(res.fieldErrors);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit worker" : "Add worker"}</DialogTitle>
          <DialogDescription>{isEdit ? "Change their access, role or status." : "Create an account and choose exactly what they can manage."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
              {errors.name && <span className="mt-1 block text-xs text-destructive">{errors.name}</span>}
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Email</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEdit} required />
              {errors.email && <span className="mt-1 block text-xs text-destructive">{errors.email}</span>}
            </label>
          </div>

          {!isEdit && (
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Temporary password</span>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 chars, a letter & a number" required />
              <span className="mt-1 block text-xs text-muted-foreground">Share it with them; they can change it from My Account.</span>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {WORKER_ROLES.map((r) => <option key={r} value={r}>{r === "BARBER" ? "Barber" : "Admin"}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">Link to barber profile (optional)</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">Not linked</option>
                {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-primary" />
              Account active (uncheck to disable sign-in)
            </label>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">What can they access?</p>
            <PermissionGrid selected={perms} onToggle={toggle} />
          </div>

          <DialogFooter className="items-center justify-between sm:justify-between">
            {isEdit ? <RemoveButton member={member!} onDone={onClose} /> : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={busy}>{isEdit ? "Save changes" : "Create worker"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ member, onDone }: { member: Member; onDone: () => void }) {
  const { busy, run } = useAction();
  const [confirming, setConfirming] = React.useState(false);
  if (!confirming) {
    return (
      <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4" /> Remove
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm">
      Sure?
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>No</Button>
      <Button type="button" size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" loading={busy}
        onClick={() => run(() => deleteWorker(member.id), { success: "Worker removed.", onSuccess: onDone })}>
        Yes, remove
      </Button>
    </span>
  );
}

function ResetDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const { busy, run } = useAction();
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string>();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {member.name}. Share it with them privately.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(undefined);
            const res = await run(() => resetWorkerPassword(member.id, pw), { success: "Password reset.", onSuccess: onClose });
            if (!res.ok) setErr(res.error);
          }}
          className="space-y-4"
        >
          <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password (8+ chars, a letter & a number)" required />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={busy}>Set password</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
