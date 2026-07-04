import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { AvailabilityManager } from "@/components/admin/availability-manager";

export const dynamic = "force-dynamic";

export default async function AdminAvailabilityPage() {
  await requirePermission("manage_schedule");
  const [businessHours, staff, staffHourRows, breaks, closures, specialHours] = await Promise.all([
    db.businessHour.findMany(),
    db.staff.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" }, select: { id: true, name: true } }),
    db.staffHour.findMany(),
    db.break.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }] }),
    db.closure.findMany({ orderBy: { startDate: "asc" } }),
    db.specialHour.findMany({ orderBy: { date: "asc" } }),
  ]);

  const staffHours: Record<string, typeof staffHourRows> = {};
  for (const h of staffHourRows) {
    (staffHours[h.staffId] ??= []).push(h);
  }

  return (
    <AvailabilityManager
      businessHours={businessHours}
      staff={staff}
      staffHours={staffHours}
      breaks={breaks}
      closures={closures}
      specialHours={specialHours}
    />
  );
}
