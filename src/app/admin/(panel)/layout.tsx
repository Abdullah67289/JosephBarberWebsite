import { requireAuth, loadGrants } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const grants = await loadGrants(session);
  const bookingScope = session.role === "BARBER" ? { staffId: session.staffId ?? "__none" } : {};
  const [pendingBookings, newMessages] = await Promise.all([
    db.booking.count({ where: { status: "pending", ...bookingScope } }),
    db.contactMessage.count({ where: { status: "new" } }),
  ]);
  return (
    <AdminShell
      session={{ name: session.name, email: session.email, role: session.role, isDevBypass: session.isDevBypass }}
      grants={[...grants]}
      notifications={{ pendingBookings, newMessages }}
    >
      {children}
    </AdminShell>
  );
}
