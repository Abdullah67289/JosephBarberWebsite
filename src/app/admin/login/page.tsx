import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAdminSignupAllowed, isDevAdminBypassAllowed } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { StaffLoginExperience } from "@/components/admin/staff-login-experience";

export const metadata: Metadata = { title: "Staff Login", robots: { index: false } };

const ERROR_NOTICES: Record<string, string> = {
  "dev-bypass-disabled": "The development bypass is disabled on this site. Sign in with your account instead.",
  forbidden: "You don't have permission to open that page.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();
  if (session) redirect(sp.next?.startsWith("/admin") ? sp.next : "/admin");

  const s = await getSettings();
  const devBypassEnabled = isDevAdminBypassAllowed();
  const signupEnabled = isAdminSignupAllowed();
  const notice = sp.error ? ERROR_NOTICES[sp.error] : undefined;

  return (
    <StaffLoginExperience
      businessName={s.businessName}
      next={sp.next}
      devBypassEnabled={devBypassEnabled}
      signupEnabled={signupEnabled}
      notice={notice}
    />
  );
}
