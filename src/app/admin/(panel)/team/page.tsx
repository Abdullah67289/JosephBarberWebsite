import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TeamManager } from "@/components/admin/team-manager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  await requireOwner();
  const [users, staff] = await Promise.all([
    db.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: { permissions: { select: { key: true } } },
    }),
    db.staff.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const members = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    staffId: u.staffId,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    permissions: u.permissions.map((p) => p.key),
  }));

  return (
    <div>
      <AdminPageHeader
        title="Manage Team"
        description="Add workers, set exactly what each one can access, and reset passwords. Only you (the owner) can see this page."
      />
      <TeamManager members={members} staff={staff} />
    </div>
  );
}
