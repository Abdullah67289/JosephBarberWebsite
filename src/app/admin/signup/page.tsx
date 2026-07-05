import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isAdminSignupAllowed } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { SignupForm } from "@/components/admin/signup-form";

export const metadata: Metadata = { title: "Create Admin Account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSignupPage() {
  const session = await getSession();
  if (session) redirect("/admin");
  const allowed = isAdminSignupAllowed();
  const s = await getSettings();

  return (
    <div className="grid min-h-screen place-items-center bg-radial-spot px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-md border border-primary/40">
            <span className="absolute inset-0 barber-pole opacity-80" aria-hidden />
            <span className="relative z-10 font-display text-sm font-bold text-background">JM</span>
          </span>
          <span className="font-display text-xl font-bold">{s.businessName}</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-7 shadow-2xl">
          {allowed ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold">Create Staff Account</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  For authorized staff and admins only. The first account created becomes the owner.
                </p>
              </div>
              <SignupForm />
              <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-center text-xs text-amber-800/90 dark:text-amber-100/90">
                Customers don&apos;t need an account to book — this page is for shop staff only and is gated by the owner.
              </p>
            </>
          ) : (
            <div className="text-center">
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-600 dark:text-amber-400" />
              <h1 className="font-display text-xl font-bold">Staff signup is currently disabled</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask the owner to create your account. For setup, an owner can enable signup with{" "}
                <code>ALLOW_ADMIN_SIGNUP=true</code> (optionally restricted by <code>ADMIN_ALLOWED_EMAILS</code>), then
                turn it off again once accounts are created.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/admin/login" className="hover:text-primary">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
