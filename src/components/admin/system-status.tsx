import { ShieldCheck, ShieldAlert, CreditCard, Mail, MessageSquare, Users, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface SystemStatusData {
  adminUsers: { email: string; role: string; isActive: boolean; lastLoginAt: string | null }[];
  allowedEmails: string;
  integrations: { stripe: boolean; email: boolean; sms: boolean };
  flags: { devBypass: boolean; signup: boolean; secretIsDefault: boolean; isProduction: boolean };
  bookingRules: { slotIntervalMin: number; minNoticeMin: number; maxAdvanceDays: number; cancellationCutoffHours: number };
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")} />;
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Dot ok={ok} />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function SystemStatus({ data }: { data: SystemStatusData }) {
  const warnings: string[] = [];
  if (data.flags.secretIsDefault) warnings.push("AUTH_SECRET is still the development default — set a strong value before production.");
  if (data.flags.devBypass) warnings.push("Dev admin bypass is ON. Turn off ALLOW_DEV_ADMIN_BYPASS before production.");
  if (data.flags.signup) warnings.push("Self-service admin signup is ON. Turn off ALLOW_ADMIN_SIGNUP once accounts are created.");
  if (!data.allowedEmails.trim()) warnings.push("No ADMIN_ALLOWED_EMAILS allowlist set — any active database user can sign in.");

  return (
    <div className="mb-8 space-y-4">
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
            <ShieldAlert className="h-4 w-4" /> Security checklist (local testing)
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-amber-800/90 dark:text-amber-100/90">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Admin users */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Admin users ({data.adminUsers.length})
          </h3>
          <ul className="space-y-2">
            {data.adminUsers.map((u) => (
              <li key={u.email} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{u.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.lastLoginAt ? `Last in ${new Date(u.lastLoginAt).toLocaleDateString()}` : "Never signed in"}
                  </span>
                </span>
                <Badge variant={u.role === "OWNER" ? "default" : "secondary"}>{u.role}</Badge>
              </li>
            ))}
          </ul>
        </div>

        {/* Integrations */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-primary" /> Integrations & mode
          </h3>
          <Row label="Payments" value={data.integrations.stripe ? "Stripe (live)" : "Mock mode"} ok={data.integrations.stripe} />
          <Row label="Email" value={data.integrations.email ? "Resend" : "Logged only"} ok={data.integrations.email} />
          <Row label="SMS" value={data.integrations.sms ? "Twilio" : "Logged only"} ok={data.integrations.sms} />
          <p className="mt-2 text-xs text-muted-foreground">
            Without provider keys the app safely logs notifications and runs checkout in mock mode.
          </p>
        </div>

        {/* Access & security */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Access & security
          </h3>
          <Row label="Environment" value={data.flags.isProduction ? "Production" : "Development"} ok={!data.flags.secretIsDefault || !data.flags.isProduction} />
          <Row label="Auth secret" value={data.flags.secretIsDefault ? "Default (dev)" : "Custom"} ok={!data.flags.secretIsDefault} />
          <Row label="Dev bypass" value={data.flags.devBypass ? "On (local)" : "Off"} ok={!data.flags.devBypass} />
          <Row label="Self-signup" value={data.flags.signup ? "On (setup)" : "Off"} ok={!data.flags.signup} />
          <Row label="Email allowlist" value={data.allowedEmails.trim() ? "Restricted" : "Any active user"} ok={Boolean(data.allowedEmails.trim())} />
        </div>
      </div>

      {/* Booking rules quick view */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" /> Current booking rules
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            { label: "Slot interval", value: `${data.bookingRules.slotIntervalMin} min` },
            { label: "Min notice", value: `${data.bookingRules.minNoticeMin} min` },
            { label: "Booking window", value: `${data.bookingRules.maxAdvanceDays} days` },
            { label: "Cancel cutoff", value: `${data.bookingRules.cancellationCutoffHours} h` },
          ].map((r) => (
            <div key={r.label} className="rounded-lg border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">{r.label}</p>
              <p className="font-display text-lg font-bold">{r.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Edit these in the “Booking Rules” tab below. Changes apply to customer booking immediately.</p>
      </div>
    </div>
  );
}
