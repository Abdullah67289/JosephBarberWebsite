import Link from "next/link";
import {
  CalendarDays,
  CalendarClock,
  DollarSign,
  Users,
  Scissors,
  Package,
  MessageSquare,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  XCircle,
  CalendarPlus,
  UserPlus,
  Wrench,
  Home,
  PackagePlus,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { todayKey, addDaysKey, localMinutesToUtc, formatInTz } from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { bookingInclude } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/admin/bookings", label: "Add booking", icon: CalendarPlus },
  { href: "/admin/staff", label: "Add barber", icon: UserPlus },
  { href: "/admin/services", label: "Add service", icon: Scissors },
  { href: "/admin/availability", label: "Edit hours", icon: Wrench },
  { href: "/admin/content", label: "Edit homepage", icon: Home },
  { href: "/admin/products", label: "Add product", icon: PackagePlus },
];

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const [session, settings, sp] = await Promise.all([requireAuth(), getSettings(), searchParams ?? Promise.resolve({})]);
  const forbidden = (sp as { error?: string }).error === "forbidden";
  // Barbers get a dashboard scoped to their own chair — no shop-wide revenue,
  // orders or message contents (those areas are ADMIN-gated elsewhere).
  const isBarber = session.role === "BARBER";
  const scope = isBarber ? { staffId: session.staffId ?? "__none" } : {};
  const tz = settings.timezone;
  const today = todayKey(tz);
  const weekEnd = addDaysKey(today, 7, tz);
  const monthPrefix = today.slice(0, 7);
  const monthStart = localMinutesToUtc(`${monthPrefix}-01`, 0, tz);

  const [
    todayBookings,
    upcomingCount,
    monthBookingRevenue,
    popular,
    paidOrderRevenue,
    pendingCount,
    cancelledCount,
    activeBarbers,
    activeServices,
    productsCount,
    newMessages,
    recentBookings,
    recentMessages,
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
    db.order.aggregate({
      where: { paymentStatus: "paid", createdAt: { gte: monthStart } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    db.booking.count({ where: { status: "pending", ...scope } }),
    db.booking.count({ where: { date: { startsWith: monthPrefix }, status: "cancelled", ...scope } }),
    db.staff.count({ where: { isActive: true } }),
    db.service.count({ where: { isActive: true } }),
    db.product.count({ where: { isActive: true } }),
    db.contactMessage.count({ where: { status: "new" } }),
    db.booking.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 6, include: bookingInclude }),
    db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const bookingRevenue = monthBookingRevenue._sum.priceCents ?? 0;
  const orderRevenue = paidOrderRevenue._sum.totalCents ?? 0;
  const serviceNames = await db.service.findMany({
    where: { id: { in: popular.map((p) => p.serviceId) } },
    select: { id: true, name: true },
  });
  const popularMax = Math.max(1, ...popular.map((p) => p._count.serviceId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{formatInTz(new Date(), tz, "EEEE, MMMM d")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s how {settings.businessName} is looking today.</p>
        </div>
      </div>

      {/* Access-denied feedback (requireRole redirects here with ?error=forbidden) */}
      {forbidden && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          You don&apos;t have permission to open that page. Ask the owner if you need access.
        </div>
      )}

      {/* Alerts */}
      {(pendingCount > 0 || (!isBarber && newMessages > 0)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {pendingCount > 0 && (
            <Link href="/admin/bookings?status=pending" className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200 transition-colors hover:bg-amber-500/10">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {pendingCount} booking{pendingCount > 1 ? "s" : ""} pending confirmation
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}
          {!isBarber && newMessages > 0 && (
            <Link href="/admin/messages" className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-gold-200 transition-colors hover:bg-primary/10">
              <MessageSquare className="h-4 w-4 shrink-0" />
              {newMessages} new message{newMessages > 1 ? "s" : ""} to read
              <ArrowRight className="ml-auto h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {(isBarber ? QUICK_ACTIONS.filter((a) => a.href === "/admin/bookings") : QUICK_ACTIONS).map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                <a.icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-medium">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <StatCard label={isBarber ? "Your bookings today" : "Today's bookings"} value={todayBookings.length} icon={CalendarDays} accent hint={`${upcomingCount} in the next 7 days`} />
        <StatCard label="Upcoming (7 days)" value={upcomingCount} icon={CalendarClock} hint="Confirmed & pending" />
        <StatCard
          label={isBarber ? "Your revenue (month)" : "Revenue (month)"}
          value={formatMoney(isBarber ? bookingRevenue : bookingRevenue + orderRevenue, settings.currency)}
          icon={DollarSign}
          hint={isBarber ? "Your confirmed bookings" : "Bookings + paid orders"}
        />
        <StatCard label="Pending bookings" value={pendingCount} icon={AlertCircle} hint={`${cancelledCount} cancelled this month`} />
        <StatCard label="Active barbers" value={activeBarbers} icon={Users} hint="Shown in booking" />
        <StatCard label="Active services" value={activeServices} icon={Scissors} hint="Bookable now" />
        {!isBarber && (
          <StatCard label="Products in shop" value={productsCount} icon={Package} hint={`${paidOrderRevenue._count._all} orders this month`} />
        )}
        {!isBarber && <StatCard label="New messages" value={newMessages} icon={MessageSquare} hint="Awaiting reply" />}
      </div>

      {/* Today's schedule + popular services */}
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Clock className="h-5 w-5 text-primary" /> Today&apos;s schedule
              </h2>
              <Link href="/admin/bookings" className="text-sm text-primary hover:underline">All bookings</Link>
            </div>
            {todayBookings.length === 0 ? (
              <div className="p-5">
                <EmptyState icon={CalendarDays} title="No bookings today" description="Enjoy the quiet — or take some walk-ins." />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {todayBookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-4 p-4">
                    <div className="w-16 shrink-0 text-center">
                      <p className="font-display text-base font-bold">{formatInTz(b.startAt, tz, "h:mm")}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{formatInTz(b.startAt, tz, "a")}</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{b.service.name} · {b.staff?.name ?? "Any barber"}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" /> Popular services
          </h2>
          {popular.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="space-y-3">
              {popular.map((p) => {
                const name = serviceNames.find((s) => s.id === p.serviceId)?.name ?? "Service";
                return (
                  <li key={p.serviceId}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate">{name}</span>
                      <span className="text-muted-foreground">{p._count.serviceId}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(p._count.serviceId / popularMax) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent bookings + recent messages */}
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="p-5"><EmptyState icon={CalendarDays} title="No bookings yet" /></div>
          ) : (
            <ul className="divide-y divide-border">
              {recentBookings.map((b) => (
                <li key={b.id} className="flex items-center gap-3 p-4">
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
        </div>

        {!isBarber && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-primary" /> Recent messages
            </h2>
            <Link href="/admin/messages" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {recentMessages.length === 0 ? (
            <div className="p-5"><EmptyState icon={MessageSquare} title="No messages yet" description="Contact form submissions appear here." /></div>
          ) : (
            <ul className="divide-y divide-border">
              {recentMessages.map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-4">
                  {m.status === "new" ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  ) : (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.subject || m.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatInTz(m.createdAt, tz, "MMM d")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        )}
      </div>

      {cancelledCount > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5" /> {cancelledCount} booking{cancelledCount > 1 ? "s" : ""} cancelled this month
        </p>
      )}
    </div>
  );
}
