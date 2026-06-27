import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { StaffManager } from "@/components/admin/staff-manager";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  await requireRole("ADMIN");
  const [staff, services] = await Promise.all([
    db.staff.findMany({ orderBy: { displayOrder: "asc" }, include: { services: true } }),
    db.service.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return <StaffManager staff={staff} services={services} />;
}
