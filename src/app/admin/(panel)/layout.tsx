import { requireAuth, loadGrants } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const grants = await loadGrants(session);
  return (
    <AdminShell
      session={{ name: session.name, email: session.email, role: session.role, isDevBypass: session.isDevBypass }}
      grants={[...grants]}
    >
      {children}
    </AdminShell>
  );
}
