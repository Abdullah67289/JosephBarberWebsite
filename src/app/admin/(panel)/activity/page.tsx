import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatInTz } from "@/lib/time";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity as ActivityIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const ACTION_STYLE: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  update: "bg-primary/15 text-primary",
  delete: "bg-destructive/15 text-destructive",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  await requireOwner();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const type = sp.type && sp.type !== "all" ? sp.type : undefined;
  const where = type ? { targetType: type } : {};

  const [settings, entries, total, types] = await Promise.all([
    getSettings(),
    db.adminActionLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.adminActionLog.count({ where }),
    db.adminActionLog.findMany({ distinct: ["targetType"], select: { targetType: true }, orderBy: { targetType: "asc" } }),
  ]);
  const tz = settings.timezone;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = (p: number) => `/admin/activity?${new URLSearchParams({ page: String(p), ...(type ? { type } : {}) })}`;

  return (
    <div>
      <AdminPageHeader title="Activity log" description="Every change made in the dashboard — who did what, and when." />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" href="/admin/activity" active={!type} />
        {types.map((t) => (
          <FilterChip key={t.targetType} label={t.targetType} href={`/admin/activity?type=${t.targetType}`} active={type === t.targetType} />
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <EmptyState icon={ActivityIcon} title="No activity yet" description="Actions like editing services, confirming bookings or updating the site will appear here." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:gap-4">
                <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ACTION_STYLE[e.action] ?? "bg-secondary text-muted-foreground"}`}>
                  {e.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.message || `${e.action} ${e.targetType}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.actorEmail}{e.actorRole ? ` · ${e.actorRole}` : ""} · {e.targetType}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatInTz(e.createdAt, tz, "MMM d, h:mm a")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {pageCount} · {total} entries</span>
          <div className="flex gap-2">
            <PagerLink href={q(page - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /> Prev</PagerLink>
            <PagerLink href={q(page + 1)} disabled={page >= pageCount}>Next <ChevronRight className="h-4 w-4" /></PagerLink>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
      {label}
    </Link>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-muted-foreground opacity-50">{children}</span>;
  return <Link href={href} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 transition-colors hover:border-primary/40">{children}</Link>;
}
