import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AccountForms } from "@/components/admin/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireAuth();
  const user = session.isDevBypass ? null : await db.user.findUnique({ where: { id: session.sub } });

  return (
    <div>
      <AdminPageHeader title="My Account" description="Update your name, email and password." />
      {session.isDevBypass ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          You&apos;re signed in with the development bypass, which has no editable account.
        </div>
      ) : (
        <AccountForms
          initialName={user?.name ?? session.name}
          initialEmail={user?.email ?? session.email}
          role={session.role}
        />
      )}
    </div>
  );
}
