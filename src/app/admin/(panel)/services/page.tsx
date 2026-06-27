import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServicesManager } from "@/components/admin/services-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  await requireRole("ADMIN");
  const [services, categories, staff] = await Promise.all([
    db.service.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { category: true, staff: true, addons: { orderBy: { displayOrder: "asc" } } },
    }),
    db.serviceCategory.findMany({ orderBy: { displayOrder: "asc" } }),
    db.staff.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  return <ServicesManager services={services} categories={categories} staff={staff} />;
}
