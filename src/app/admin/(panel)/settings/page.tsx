import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { env, isAdminSignupAllowed, isDevAdminBypassAllowed } from "@/lib/env";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { SystemStatus } from "@/components/admin/system-status";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("OWNER");
  const [settings, adminUsers] = await Promise.all([
    getSettings(),
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { email: true, role: true, isActive: true, lastLoginAt: true },
    }),
  ]);

  return (
    <div>
      <AdminPageHeader title="Settings" description="System status, business details, booking rules and notifications." />
      <SystemStatus
        data={{
          adminUsers: adminUsers.map((u) => ({
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
          })),
          allowedEmails: env.adminAllowedEmails,
          integrations: {
            stripe: env.stripe.isConfigured,
            email: env.email.isConfigured,
            sms: env.sms.isConfigured,
          },
          flags: {
            devBypass: isDevAdminBypassAllowed(),
            signup: isAdminSignupAllowed(),
            secretIsDefault: env.authSecret.startsWith("dev-only"),
            isProduction: env.isProduction,
          },
          bookingRules: {
            slotIntervalMin: settings.slotIntervalMin,
            minNoticeMin: settings.minNoticeMin,
            maxAdvanceDays: settings.maxAdvanceDays,
            cancellationCutoffHours: settings.cancellationCutoffHours,
          },
        }}
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
