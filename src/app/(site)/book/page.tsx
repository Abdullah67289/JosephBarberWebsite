import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getPageContent } from "@/lib/queries";
import { PageHeader } from "@/components/site/page-header";
import { BookingWizard, type WizardService, type WizardStaff } from "@/components/booking/booking-wizard";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Book your next cut, fade, beard trim or hot-towel shave online in under a minute.",
};

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; barber?: string }>;
}) {
  const sp = await searchParams;
  const [settings, page, services, staff] = await Promise.all([
    getSettings(),
    getPageContent("booking", {
      eyebrow: "Booking",
      title: "Book your chair",
      subtitle: "Real-time availability. Choose your service, barber and time - confirmed instantly.",
    }),
    db.service.findMany({
      where: { isActive: true, isBookable: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        durationMin: true,
        priceCents: true,
        depositCents: true,
        icon: true,
        category: { select: { name: true } },
        addons: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          select: { id: true, name: true, priceCents: true, durationMin: true },
        },
        staff: { select: { staffId: true } },
      },
    }),
    db.staff.findMany({
      where: { isActive: true, acceptsBookings: true },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, slug: true, title: true, photoUrl: true },
    }),
  ]);

  const wizardServices: WizardService[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    durationMin: s.durationMin,
    priceCents: s.priceCents,
    depositCents: s.depositCents,
    icon: s.icon,
    categoryName: s.category?.name ?? "Services",
    staffIds: s.staff.map((ss) => ss.staffId),
    addons: s.addons.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, durationMin: a.durationMin })),
  }));

  const wizardStaff: WizardStaff[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    title: s.title,
    photoUrl: s.photoUrl,
  }));

  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow ?? "Booking"}
        title={page.title}
        description={page.subtitle ?? undefined}
      />
      <section className="section">
        <div className="container">
          <BookingWizard
            services={wizardServices}
            staff={wizardStaff}
            settings={{
              timezone: settings.timezone,
              currency: settings.currency,
              maxAdvanceDays: settings.maxAdvanceDays,
              depositRequired: settings.depositRequired,
              cancellationPolicy: settings.cancellationPolicy,
              allowAnyBarber: settings.allowAnyBarber,
              requireCustomerName: settings.requireCustomerName,
              requireCustomerEmail: settings.requireCustomerEmail,
              requireCustomerPhone: settings.requireCustomerPhone,
              requireCustomerNotes: settings.requireCustomerNotes,
              bookingHelpText: settings.bookingHelpText,
              bookingNotesHelpText: settings.bookingNotesHelpText,
              bookingConfirmationTitle: settings.bookingConfirmationTitle,
              bookingConfirmationText: settings.bookingConfirmationText,
            }}
            preselectServiceSlug={sp.service}
            preselectBarberSlug={sp.barber}
          />
        </div>
      </section>
    </>
  );
}
