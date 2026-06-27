import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getBookingByToken, canCustomerModify } from "@/lib/booking-service";
import { PageHeader } from "@/components/site/page-header";
import { BookingManager } from "@/components/booking/booking-manager";

export const metadata: Metadata = { title: "Manage Your Booking", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ManageBookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) notFound();

  const [settings, eligibleStaff, mod] = await Promise.all([
    getSettings(),
    db.staff.findMany({
      where: { isActive: true, acceptsBookings: true, services: { some: { serviceId: booking.serviceId } } },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, slug: true, title: true, photoUrl: true },
    }),
    canCustomerModify(booking.startAt),
  ]);

  return (
    <>
      <PageHeader eyebrow="Your Booking" title="Manage your appointment" />
      <section className="section">
        <div className="container max-w-2xl">
          <BookingManager
            token={token}
            booking={{
              reference: booking.reference,
              status: booking.status,
              serviceId: booking.serviceId,
              serviceName: booking.service.name,
              staffId: booking.staffId,
              staffName: booking.staff?.name ?? null,
              startISO: booking.startAt.toISOString(),
              durationMin: Math.round((booking.endAt.getTime() - booking.startAt.getTime()) / 60000),
              priceCents: booking.priceCents,
              notes: booking.notes,
              customerName: booking.customer.name,
              customerEmail: booking.customer.email,
              customerPhone: booking.customer.phone,
            }}
            staff={eligibleStaff}
            settings={{
              timezone: settings.timezone,
              currency: settings.currency,
              maxAdvanceDays: settings.maxAdvanceDays,
              cancellationPolicy: settings.cancellationPolicy,
              phone: settings.phone,
              allowAnyBarber: settings.allowAnyBarber,
            }}
            canModify={mod.allowed}
            cutoffHours={mod.cutoffHours}
          />
        </div>
      </section>
    </>
  );
}
