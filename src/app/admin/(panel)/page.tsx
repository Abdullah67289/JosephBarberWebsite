import Link from "next/link";
import {
  CalendarPlus,
  Clock,
  Scissors,
  UserPlus,
  Home,
  PackagePlus,
  CalendarDays,
  MessageSquare,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth, loadGrants } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { todayKey, addDaysKey, localMinutesToUtc, formatInTz } from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { bookingInclude } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/admin/bookings", label: "New booking", icon: CalendarPlus, grant: "manage_bookings" },
  { href: "/admin/availability", label: "Edit hours", icon: Clock, grant: "manage_schedule" },
  { href: "/admin/services", label: "Services", icon: Scissors, grant: "manage_services" },
  { href: "/admin/staff", label: "Barbers", icon: UserPlus, grant: "manage_staff" },
  { href: "/admin/content", label: "Homepage", icon: Home, grant: "manage_content" },
  { href: "/admin/products", label: "Products", icon: PackagePlus, grant: "manage_shop" },
] as const;

const WEEKS = 8;

function dayKeyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [session, settings, sp] = await Promise.all([requireAuth(), getSettings(), searchParams ?? Promise.resolve({})]);
  const grants = await loadGrants(session);
  const isOwnerish = session.role === "OWNER" || Boolean(session.isDevBypass);
  const can = (key: string) => isOwnerish || grants.has(key as never);
  const forbidden = (sp as { error?: string }).error === "forbidden";

  // Barbers see only their own chair; access is decided by grants, but data
  // scoping still keys off the BARBER role + linked staff profile.
  const isBarber = session.role === "BARBER";
  const scope = isBarber ? { staffId: session.staffId ?? "__none" } : {};

  const tz = settings.timezone;
  const today = todayKey(tz);
  const weekEnd = addDaysKey(today, 7, tz);
  const monthPrefix = today.slice(0, 7);
  const monthStart = localMinutesToUtc(`${monthPrefix}-01`, 0, tz);
  const chartStartKey = addDaysKey(today, -(WEEKS * 7 - 1), tz);
  const chartStartUtc = localMinutesToUtc(chartStartKey, 0, tz);

  const [
    todayBookings,
    upcomingCount,
    monthBookingRevenue,
    popular,
    paidOrderRevenue,
    pendingCount,
    cancelledCount,
    newMessages,
    recentBookings,
    recentMessages,
    chartBookings,
    chartOrders,
  ] = await Promise.all([
    db.booking.findMany({
      where: { date: today, status: { notIn: ["cancelled"] }, ...scope },
      include: bookingInclude,
      orderBy: { startAt: "asc" },
    }),
    db.booking.count({ where: { date: { gt: today, lte: weekEnd }, status: { in: ["confirmed", "pending"] }, ...scope } }),
    db.booking.aggregate({
      where: { date: { startsWith: monthPrefix }, status: { in: ["confirmed", "completed"] }, ...scope },
      _sum: { priceCents: true },
    }),
    db.booking.groupBy({
      by: ["serviceId"],
      where: { status: { in: ["confirmed", "completed"] }, ...scope },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: "desc" } },
      take: 5,
    }),
    isBarber
      ? Promise.resolve(null)
      : db.order.aggregate({
          where: { paymentStatus: "paid", createdAt: { gte: monthStart } },
          _sum: { totalCents: true },
          _count: { _all: true },
        }),
    db.booking.count({ where: { status: "pending", ...scope } }),
    db.booking.count({ where: { date: { startsWith: monthPrefix }, status: "cancelled", ...scope } }),
    can("manage_messages") ? db.contactMessage.count({ where: { status: "new" } }) : Promise.resolve(0),
    db.booking.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 5, include: bookingInclude }),
    can("manage_messages")
      ? db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 4 })
      : Promise.resolve([]),
    db.booking.findMany({
      where: { date: { gte: chartStartKey }, status: { in: ["confirmed", "completed"] }, ...scope },
      select: { date: true, priceCents: true },
    }),
    isBarber
      ? Promise.resolve([])
      : db.order.findMany({
          where: { paymentStatus: "paid", createdAt: { gte: chartStartUtc } },
          select: { createdAt: true, totalCents: true },
        }),
  ]);

  const bookingRevenue = monthBookingRevenue._sum.priceCents ?? 0;
  const orderRevenue = paidOrderRevenue?._sum.totalCents ?? 0;
  const monthRevenue = bookingRevenue + orderRevenue;

  const serviceNames = await db.service.findMany({
    where: { id: { in: popular.map((p) => p.serviceId) } },
    select: { id: true, name: true },
  });
  const popularMax = Math.max(1, ...popular.map((p) => p._count.serviceId));

  // ---- Weekly revenue buckets for the chart -------------------------------
  const startUtcMs = dayKeyToUtc(chartStartKey);
  const buckets: { label: string; cents: number }[] = Array.from({ length: WEEKS }, (_, i) => {
    const startKey = addDaysKey(chartStartKey, i * 7, tz);
    const [, m, d] = startKey.split("-").map(Number);
    const label = `${new Date(Date.UTC(2000, (m ?? 1) - 1, 1)).toLocaleString("en", { month: "short" })} ${d}`;
    return { label, cents: 0 };
  });
  const bucketIndex = (dayKey: string) => {
    const idx = Math.floor((dayKeyToUtc(dayKey) - startUtcMs) / (7 * 86400_000));
    return idx >= 0 && idx < WEEKS ? idx : null;
  };
  for (const b of chartBookings) {
    const idx = bucketIndex(b.date);
    if (idx !== null) buckets[idx]!.cents += b.priceCents;
  }
  for (const o of chartOrders) {
    const idx = bucketIndex(formatInTz(o.createdAt, tz, "yyyy-MM-dd"));
    if (idx !== null) buckets[idx]!.cents += o.totalCents;
  }

  const attention: { href: string; label: string }[] = [];
  if (pendingCount > 0) attention.push({ href: "/admin/bookings?status=pending", label: `${pendingCount} booking${pendingCount === 1 ? "" : "s"} awaiting confirmation` });
  if (newMessages > 0) attention.push({ href: "/admin/messages", label: `${newMessages} unread message${newMessages === 1 ? "" : "s"}` });

  const actions = QUICK_ACTIONS.filter((a) => can(a.grant));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {formatInTz(new Date(), tz, "EEEE")}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
          {formatInTz(new Date(), tz, "MMMM d")}
        </h1>
        {actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <a.icon className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {forbidden && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          You don&apos;t have permission to open that page. Ask the owner if you need access.
        </div>
      )}

      {attention.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {attention.map((a) => (
            <Link key={a.href} href={a.href} className="group inline-flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              <span className="text-foreground underline-offset-4 group-hover:underline">{a.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      {/* Stat strip — numbers, not boxes */}
      <div className="grid grid-cols-2 gap-y-8 border-y border-border py-6 sm:grid-cols-4 sm:divide-x sm:divide-border">
        <Stat label={isBarber ? "Your bookings today" : "Bookings today"} value={String(todayBookings.length)} />
        <Stat label="Next 7 days" value={String(upcomingCount)} />
        <Stat
          label={isBarber ? "Your revenue this month" : "Revenue this month"}
          value={formatMoney(monthRevenue, settings.currency)}
        />
        <Stat label="Pending" value={String(pendingCount)} accent={pendingCount > 0} />
      </div>

      {/* Revenue + popular services */}
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <header className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Revenue, last {WEEKS} weeks</h2>
            <span className="text-sm text-muted-foreground">
              {formatMoney(buckets.reduce((s, b) => s + b.cents, 0), settings.currency)} total
            </span>
          </header>
          <RevenueChart buckets={buckets} currency={settings.currency} />
        </section>

        <section>
          <header className="mb-4">
            <h2 className="font-display text-lg font-semibold">Popular services</h2>
          </header>
          {popular.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed bookings yet.</p>
          ) : (
            <ul className="space-y-4">
              {popular.map((p) => {
                const name = serviceNames.find((s) => s.id === p.serviceId)?.name ?? "Service";
                return (
                  <li key={p.serviceId}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="truncate">{name}</span>
                      <span className="tabular-nums text-muted-foreground">{p._count.serviceId}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{ width: `${(p._count.serviceId / popularMax) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Today's schedule */}
      <section>
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold">Today&apos;s schedule</h2>
          {can("manage_bookings") && (
            <Link href="/admin/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
              All bookings
            </Link>
          )}
        </header>
        {todayBookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No bookings today" description="Enjoy the quiet — or take some walk-ins." />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {todayBookings.map((b) => (
              <li key={b.id} className="flex items-center gap-4 py-3.5">
                <span className="w-20 shrink-0 font-display text-base font-bold tabular-nums">
                  {formatInTz(b.startAt, tz, "h:mm a")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.service.name} · {b.staff?.name ?? "Any barber"}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent activity */}
      <div className={`grid gap-10 ${recentMessages.length > 0 || can("manage_messages") ? "lg:grid-cols-2" : ""}`}>
        <section>
          <header className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
          </header>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.customer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.service.name} · {formatInTz(b.startAt, tz, "MMM d, h:mm a")}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {can("manage_messages") && (
          <section>
            <header className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Messages</h2>
              <Link href="/admin/messages" className="text-sm text-primary underline-offset-4 hover:underline">
                Inbox
              </Link>
            </header>
            {recentMessages.length === 0 ? (
              <EmptyState icon={MessageSquare} title="No messages yet" description="Contact form submissions appear here." />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {recentMessages.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.status === "new" ? "bg-primary" : "bg-border"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.subject || m.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatInTz(m.createdAt, tz, "MMM d")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {cancelledCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {cancelledCount} booking{cancelledCount > 1 ? "s" : ""} cancelled this month.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-1 sm:px-6 first:sm:pl-0 last:sm:pr-0">
      <p className={`font-display text-3xl font-bold tabular-nums tracking-tight ${accent ? "text-primary" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * Minimal weekly revenue bars — pure SVG, token colours, no library. Each bar
 * carries a tooltip with the exact amount; the current week reads slightly
 * stronger than the rest.
 */
function RevenueChart({ buckets, currency }: { buckets: { label: string; cents: number }[]; currency: string }) {
  const W = 336;
  const H = 116;
  const chartH = 88;
  const barW = 26;
  const gap = (W - buckets.length * barW) / (buckets.length + 1);
  const max = Math.max(1, ...buckets.map((b) => b.cents));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly revenue chart">
      {buckets.map((b, i) => {
        const h = b.cents === 0 ? 2 : Math.max(3, Math.round((b.cents / max) * chartH));
        const x = gap + i * (barW + gap);
        const y = chartH - h + 8;
        const isCurrent = i === buckets.length - 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              style={{
                fill: b.cents === 0 ? "hsl(var(--border))" : `hsl(var(--primary) / ${isCurrent ? 1 : 0.55})`,
              }}
            >
              <title>{`Week of ${b.label}: ${formatMoney(b.cents, currency)}`}</title>
            </rect>
            {(i === 0 || isCurrent || i === Math.floor(buckets.length / 2)) && (
              <text
                x={x + barW / 2}
                y={H - 4}
                textAnchor="middle"
                style={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              >
                {b.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={chartH + 8.5} x2={W} y2={chartH + 8.5} style={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
    </svg>
  );
}
