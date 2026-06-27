import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { env, isAdminSignupAllowed, isDevAdminBypassAllowed, isLocalSiteUrl } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { StaffLoginExperience } from "@/components/admin/staff-login-experience";

export const metadata: Metadata = { title: "Staff Login", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const session = await getSession();
  if (session) redirect(sp.next?.startsWith("/admin") ? sp.next : "/admin");

  const s = await getSettings();
  const devBypassEnabled = isDevAdminBypassAllowed();
  const signupEnabled = isAdminSignupAllowed();
  const showTestCreds = !env.isProduction || isLocalSiteUrl();

  return (
    <StaffLoginExperience
      businessName={s.businessName}
      next={sp.next}
      devBypassEnabled={devBypassEnabled}
      showTestCreds={showTestCreds}
      signupEnabled={signupEnabled}
    />
  );
}
