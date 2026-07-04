import Link from "next/link";
import { Download, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { bookingInclude } from "@/lib/booking-service";
import { BOOKING_STATUSES } from "@/lib/validation";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BookingsTable } from "@/components/admin/bookings-table";
import { AdminBookingDialog } from "@/components/admin/admin-booking-dialog";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; barber?: string; date?: string }>;
}) {
  const session = await requirePermission("manage_bookings");
  const { q, status, barber, date } = await searchParams;

  const where: Prisma.BookingWhereInput = {};
  if (status && status !== "all") where.status = status;
  if (session.role === "BARBER") {
    where.staffId = session.staffId ?? "__none";
  } else if (barber && barber !== "all") where.staffId = barber;
  if (date) where.date = date;
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { email: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const [bookings, settings, staff, services] = await Promise.all([
    db.booking.findMany({ where, include: bookingInclude, orderBy: { startAt: "desc" }, take: 120 }),
    getSettings(),
    db.staff.findMany({
      where: { isActive: true, ...(session.role === "BARBER" ? { id: session.staffId ?? "__none" } : {}) },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.service.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { category: true, addons: { where: { isActive: true } }, staff: true },
    }),
  ]);

  const exportQs = new URLSearchParams();
  if (status) exportQs.set("status", status);
  if (barber) exportQs.set("barber", barber);
  if (date) exportQs.set("date", date);
  if (q) exportQs.set("q", q);

  const wizardServices = services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    depositCents: s.depositCents,
    icon: s.icon,
    categoryName: s.category?.name ?? "Services",
    staffIds: s.staff.map((x) => x.staffId),
    addons: s.addons.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, durationMin: a.durationMin })),
  }));

  return (
    <div>
      <AdminPageHeader
        title="Bookings"
        description="View, create and manage every appointment."
        action={
          <div className="flex gap-2">
            {session.role !== "BARBER" && (
              <Button asChild variant="outline">
                <a href={`/api/admin/bookings/export?${exportQs.toString()}`}>
                  <Download className="h-4 w-4" /> Export CSV
                </a>
              </Button>
            )}
            <AdminBookingDialog services={wizardServices} staff={staff} timezone={settings.timezone} currency={settings.currency} maxAdvanceDays={settings.maxAdvanceDays} />
          </div>
        }
      />

      {/* Filters */}
      <form method="get" className="mb-5 grid gap-2 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={q} placeholder="Search name, phone, email or ref" className="h-11 w-full rounded-md border border-input bg-background/60 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <select name="status" defaultValue={status ?? "all"} className="h-11 rounded-md border border-input bg-background/60 px-3 text-sm capitalize">
          <option value="all">All statuses</option>
          {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select name="barber" defaultValue={barber ?? "all"} className="h-11 rounded-md border border-input bg-background/60 px-3 text-sm">
          <option value="all">{session.role === "BARBER" ? "My bookings" : "All barbers"}</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" name="date" defaultValue={date} className="h-11 flex-1 rounded-md border border-input bg-background/60 px-3 text-sm" />
          <Button type="submit">Filter</Button>
        </div>
        {(q || status || barber || date) && (
          <Link href="/admin/bookings" className="text-sm text-muted-foreground hover:text-primary lg:col-span-5">
            Clear filters
          </Link>
        )}
      </form>

      <BookingsTable
        bookings={bookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          status: b.status,
          startISO: b.startAt.toISOString(),
          serviceName: b.service.name,
          serviceId: b.serviceId,
          staffId: b.staffId,
          staffName: b.staff?.name ?? null,
          customerName: b.customer.name,
          customerEmail: b.customer.email,
          customerPhone: b.customer.phone,
          notes: b.notes,
          internalNotes: b.internalNotes,
          priceCents: b.priceCents,
          source: b.source,
        }))}
        staff={staff}
        timezone={settings.timezone}
        currency={settings.currency}
        maxAdvanceDays={settings.maxAdvanceDays}
      />
    </div>
  );
}
