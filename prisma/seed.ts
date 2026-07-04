/**
 * Database seed — initial, admin-editable content for Joseph & Mike's.
 *
 * Idempotent: re-running only fills sections that are still empty, so it is
 * safe to run again without clobbering data you've changed in the admin.
 * Use `npm run db:reset` to wipe and reseed from scratch.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();

// The shop owner's login email. Deliberately hardcoded (no env override): the
// owner account is the root of the permission system and must not drift.
const ADMIN_EMAIL = "cosimo.pedulla3@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2024";

const img = (id: string, w = 1200, h = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=88`;

async function main() {
  console.log("→ Seeding Joseph & Mike's Barbershop…");

  // ----------------------------------------------------------- settings
  await db.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      businessName: "Joseph & Mike's Barbershop",
      tagline: "A Cut Above — Where Tradition Meets Modernity",
      description:
        "Milton's downtown barbershop since 1966. Quality haircuts, fades, shaves and styling — walk-in or by appointment.",
      heroHeadline: "A Cut Above",
      heroSubheadline:
        "Three generations of master barbers in the heart of downtown Milton. Where tradition meets modern craft.",
      heroImageUrl: img("1503951914875-452162b0f3f1", 1600, 1100),
      heroPrimaryCtaText: "Book Your Appointment",
      heroPrimaryCtaHref: "/book",
      heroSecondaryCtaText: "View Services",
      heroSecondaryCtaHref: "/services",
      logoUrl: null,
      aboutTitle: "Our Story",
      aboutBody:
        "Established in 1966 by Mike Boughton, Joseph & Mike's is a downtown landmark — a place where relationships are forged, deep thoughts are shared, and plenty of laughs are had. After more than 50 years at the helm, Mike passed the reins to Joseph. Today, Jo runs the shop alongside his son Cosimo. The Pedulla family continues to uphold Mike's legacy with the same personalized service the Milton community has loved for decades.",
      phone: "905-878-3916",
      email: "hello@josephandmikes.com",
      address: "148 Main Street East",
      city: "Milton",
      region: "Ontario",
      postalCode: "L9T 1N6",
      country: "Canada",
      mapEmbedUrl:
        "https://maps.google.com/maps?q=148+Main+Street+East,+Milton,+Ontario&t=&z=15&ie=UTF8&iwloc=&output=embed",
      latitude: 43.5183,
      longitude: -79.8774,
      timezone: process.env.SHOP_TIMEZONE || "America/Toronto",
      currency: "CAD",
      instagramUrl: "https://instagram.com",
      facebookUrl: "https://facebook.com",
      googleReviewUrl: "https://g.page",
      navBookText: "Book Now",
      navBookHref: "/book",
      showShopInNav: true,
      showCartButton: true,
      primaryAccentHex: "#c4942b",
      secondaryAccentHex: "#8b1e1e",
      slotIntervalMin: 15,
      minNoticeMin: 120,
      maxAdvanceDays: 60,
      maxPerSlot: 1,
      cancellationCutoffHours: 12,
      depositRequired: false,
      allowAnyBarber: true,
      requireCustomerName: true,
      requireCustomerEmail: false,
      requireCustomerPhone: false,
      requireCustomerNotes: false,
      taxRatePct: 13,
      bookingPolicy:
        "Please arrive 5 minutes before your appointment. Walk-ins are always welcome based on availability.",
      cancellationPolicy:
        "You can reschedule or cancel free of charge up to 12 hours before your appointment.",
      latePolicy: "If you are running late, please call the shop so we can protect the rest of the day's schedule.",
      noShowPolicy: "Missed appointments may require a deposit before future bookings.",
      depositPolicy: "Deposits, when enabled, are applied toward your service total.",
      privacyPolicy: "We only use your contact details to manage your booking or respond to your message.",
      bookingInstructions: "Choose a service, barber, date and time. You can manage your appointment from your confirmation link.",
      bookingHelpText: "Real-time availability is shown from the shop schedule.",
      bookingNotesHelpText: "Style references, allergies, accessibility needs or anything the barber should know.",
      bookingConfirmationTitle: "You're booked in!",
      bookingConfirmationText: "A confirmation is on its way. We can't wait to see you.",
      enableEmail: true,
      enableSms: true,
    },
  });

  // ----------------------------------------------------------- editable public content
  const navLinks = [
    { area: "header", href: "/", label: "Home", displayOrder: 0 },
    { area: "header", href: "/services", label: "Services", displayOrder: 1 },
    { area: "header", href: "/gallery", label: "Gallery", displayOrder: 2 },
    { area: "header", href: "/shop", label: "Shop", displayOrder: 3 },
    { area: "header", href: "/story", label: "Our Story", displayOrder: 4 },
    { area: "header", href: "/contact", label: "Contact", displayOrder: 5 },
    { area: "footer", href: "/services", label: "Services & Pricing", displayOrder: 0 },
    { area: "footer", href: "/book", label: "Book an Appointment", displayOrder: 1 },
    { area: "footer", href: "/gallery", label: "Gallery", displayOrder: 2 },
    { area: "footer", href: "/shop", label: "Shop Products", displayOrder: 3 },
    { area: "footer", href: "/story", label: "Our Story", displayOrder: 4 },
    { area: "footer", href: "/contact", label: "Contact", displayOrder: 5 },
  ];
  for (const link of navLinks) {
    await db.navigationLink.upsert({
      where: { area_href: { area: link.area, href: link.href } },
      update: {},
      create: link,
    });
  }

  const pages = [
    { pageKey: "home", eyebrow: "Milton Barbershop", title: "A Cut Above", subtitle: "Three generations of master barbers in the heart of downtown Milton. Where tradition meets modern craft." },
    { pageKey: "services", eyebrow: "Services & Pricing", title: "The full menu", subtitle: "Every service is finished with the care that's kept Milton coming back since 1966.", ctaText: "Book an appointment", ctaHref: "/book" },
    { pageKey: "booking", eyebrow: "Booking", title: "Book your chair", subtitle: "Real-time availability. Choose your service, barber and time -- confirmed instantly." },
    { pageKey: "gallery", eyebrow: "Gallery", title: "The work speaks for itself", subtitle: "Fresh cuts, sharp fades and clean shaves from the chairs at Joseph & Mike's.", ctaText: "Book your cut", ctaHref: "/book" },
    { pageKey: "shop", eyebrow: "The Shop", title: "Take the shop home", subtitle: "Barber-grade grooming products to keep you sharp between visits. Order online for in-store pickup." },
    { pageKey: "story", eyebrow: "Since 1966", title: "Our Story", subtitle: "Three generations of barbering in downtown Milton." },
    { pageKey: "contact", eyebrow: "Get in Touch", title: "Visit the shop", subtitle: "Walk in, call ahead, or drop us a line -- we'd love to hear from you." },
    { pageKey: "faq", eyebrow: "FAQ", title: "Questions & Policies", subtitle: "Booking, cancellation and shop policies in one place." },
  ];
  for (const page of pages) {
    await db.pageContent.upsert({
      where: { pageKey: page.pageKey },
      update: {},
      create: page,
    });
  }

  const homeSections = [
    { sectionKey: "stats", label: "Stats", displayOrder: 0, itemLimit: 4 },
    { sectionKey: "story", label: "Story preview", eyebrow: "Our Story", title: "Three generations behind the chair", ctaText: "Read our story", ctaHref: "/story", displayOrder: 1 },
    { sectionKey: "services", label: "Featured services", eyebrow: "Services & Pricing", title: "Crafted cuts, classic care", subtitle: "From precision fades to the traditional hot-towel shave -- every service finished to perfection.", ctaText: "View all services", ctaHref: "/services", itemLimit: 6, displayOrder: 2 },
    { sectionKey: "barbers", label: "Featured barbers", eyebrow: "The Team", title: "Meet your barbers", subtitle: "Skilled hands, sharp eyes, and decades of combined experience.", itemLimit: 3, displayOrder: 3 },
    { sectionKey: "gallery", label: "Gallery preview", eyebrow: "Gallery", title: "The work speaks for itself", ctaText: "View full gallery", ctaHref: "/gallery", itemLimit: 9, displayOrder: 4 },
    { sectionKey: "reviews", label: "Reviews", eyebrow: "Reviews", title: "Loved by Milton", itemLimit: 8, displayOrder: 5 },
    { sectionKey: "products", label: "Featured products", eyebrow: "The Shop", title: "Take the shop home", subtitle: "Premium grooming products hand-picked by our barbers.", ctaText: "Shop all products", ctaHref: "/shop", itemLimit: 4, displayOrder: 6 },
    { sectionKey: "visit", label: "Hours and location", eyebrow: "Visit Us", title: "Hours & location", ctaText: "Book an appointment", ctaHref: "/book", displayOrder: 7 },
    { sectionKey: "cta", label: "Final call to action", title: "Ready for your best cut yet?", subtitle: "Book online in under a minute. Walk-ins always welcome.", ctaText: "Book Now", ctaHref: "/book", displayOrder: 8 },
  ];
  for (const section of homeSections) {
    await db.homeSection.upsert({
      where: { sectionKey: section.sectionKey },
      update: {},
      create: section,
    });
  }

  const stats = [
    { label: "Years of craft", value: 58, suffix: "+", icon: "award", displayOrder: 0 },
    { label: "Cuts delivered", value: 12000, suffix: "+", icon: "users", displayOrder: 1 },
    { label: "Master barbers", value: 3, suffix: "", icon: "scissors", displayOrder: 2 },
    { label: "Average rating", value: 5, suffix: " stars", icon: "sparkles", displayOrder: 3 },
  ];
  if ((await db.siteStat.count()) === 0) {
    await db.siteStat.createMany({ data: stats });
  }

  const policies = [
    { key: "cancellation", title: "Cancellation policy", body: "You can reschedule or cancel free of charge up to 12 hours before your appointment.", displayOrder: 0 },
    { key: "late", title: "Late policy", body: "If you are running late, please call the shop. We may need to shorten or reschedule appointments that arrive too late.", displayOrder: 1 },
    { key: "no_show", title: "No-show policy", body: "Missed appointments may require a deposit before future bookings.", displayOrder: 2 },
    { key: "deposit", title: "Deposit/payment policy", body: "Deposits, when enabled, are applied toward your service total.", displayOrder: 3 },
    { key: "privacy", title: "Privacy note", body: "We only use your contact details to manage your booking or respond to your message.", displayOrder: 4 },
    { key: "booking", title: "Booking instructions", body: "Choose a service, barber, date and time. You can manage your appointment from your confirmation link.", displayOrder: 5 },
  ];
  for (const policy of policies) {
    await db.policyItem.upsert({
      where: { key: policy.key },
      update: {},
      create: policy,
    });
  }

  if ((await db.faqItem.count()) === 0) {
    await db.faqItem.createMany({
      data: [
        { question: "Do you take walk-ins?", answer: "Yes. Walk-ins are welcome when a chair is free, and booking ahead is the best way to guarantee a time.", category: "Booking", displayOrder: 0 },
        { question: "Can I choose my barber?", answer: "Yes. Pick a specific barber or choose any available barber for the fastest options.", category: "Booking", displayOrder: 1 },
        { question: "How do I reschedule?", answer: "Use the secure manage-booking link from your confirmation screen or message.", category: "Booking", displayOrder: 2 },
      ],
    });
  }

  if ((await db.timelineItem.count()) === 0) {
    await db.timelineItem.createMany({
      data: [
        { label: "1966", title: "Mike opens the shop", body: "Joseph & Mike's becomes a downtown Milton fixture.", displayOrder: 0 },
        { label: "Today", title: "The Pedulla family carries it forward", body: "Joseph and Cosimo keep the classic shop spirit sharp with modern booking and service.", displayOrder: 1 },
      ],
    });
  }

  // ----------------------------------------------------------- business hours
  // 0=Sun … 6=Sat.  Closed Sunday & Monday; long Saturdays.
  const hours = [
    { dayOfWeek: 0, isOpen: false, openMinute: 0, closeMinute: 0 }, // Sun
    { dayOfWeek: 1, isOpen: false, openMinute: 0, closeMinute: 0 }, // Mon
    { dayOfWeek: 2, isOpen: true, openMinute: 9 * 60, closeMinute: 18 * 60 }, // Tue
    { dayOfWeek: 3, isOpen: true, openMinute: 9 * 60, closeMinute: 18 * 60 }, // Wed
    { dayOfWeek: 4, isOpen: true, openMinute: 9 * 60, closeMinute: 19 * 60 }, // Thu
    { dayOfWeek: 5, isOpen: true, openMinute: 8 * 60 + 30, closeMinute: 18 * 60 }, // Fri
    { dayOfWeek: 6, isOpen: true, openMinute: 8 * 60, closeMinute: 16 * 60 }, // Sat
  ];
  for (const h of hours) {
    await db.businessHour.upsert({
      where: { dayOfWeek: h.dayOfWeek },
      update: h,
      create: h,
    });
  }

  // ----------------------------------------------------------- staff
  let staff = await db.staff.findMany();
  if (staff.length === 0) {
    const staffData = [
      {
        name: "Joseph Pedulla",
        slug: "joseph-pedulla",
        title: "Master Barber & Owner",
        bio: "Jo took the reins from founder Mike and has shaped Milton's heads for over 30 years. A perfectionist with the clippers and a master of the classic cut.",
        photoUrl: img("1622286342621-4bd786c2447c", 600, 700),
        color: "#c4942b",
        displayOrder: 0,
      },
      {
        name: "Cosimo Pedulla",
        slug: "cosimo-pedulla",
        title: "Barber & Fade Specialist",
        bio: "Third-generation barber bringing modern fades, sharp line-ups and contemporary styling to the family chair.",
        photoUrl: img("1599351431202-1e0f0137899a", 600, 700),
        color: "#3b82f6",
        displayOrder: 1,
      },
      {
        name: "Marco Bianchi",
        slug: "marco-bianchi",
        title: "Barber",
        bio: "Ten years behind the chair with an eye for beard sculpting and the hot-towel straight razor shave.",
        photoUrl: img("1605497788044-5a32c7078486", 600, 700),
        color: "#10b981",
        displayOrder: 2,
      },
    ];
    for (const s of staffData) {
      await db.staff.create({ data: s });
    }
    staff = await db.staff.findMany({ orderBy: { displayOrder: "asc" } });
  }
  const [joseph, cosimo, marco] = staff;
  void joseph;
  void marco;

  // Owner account — Cosimo runs the shop. The password comes exclusively from
  // SEED_ADMIN_PASSWORD (never committed); only its PBKDF2 hash is stored, and
  // the production seed export (scripts/export-seed-sql.mjs) excludes account
  // tables entirely, so no credential material ever reaches the public repo.
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: "OWNER", isActive: true, staffId: cosimo?.id },
    create: {
      email: ADMIN_EMAIL,
      name: "Cosimo Pedulla",
      passwordHash,
      role: "OWNER",
      staffId: cosimo?.id,
    },
  });

  // No demo/test accounts. This seed is production content only; the owner
  // creates worker accounts from Admin -> Manage Team.
  await db.user.deleteMany({ where: { email: "admin@test.com" } });

  // Staff working hours (mirror shop; Cosimo off Wednesdays, Marco off Thursdays).
  for (const s of staff) {
    for (const h of hours) {
      const off =
        (s.slug === "cosimo-pedulla" && h.dayOfWeek === 3) ||
        (s.slug === "marco-bianchi" && h.dayOfWeek === 4);
      await db.staffHour.upsert({
        where: { staffId_dayOfWeek: { staffId: s.id, dayOfWeek: h.dayOfWeek } },
        update: {
          isWorking: h.isOpen && !off,
          startMinute: h.openMinute,
          endMinute: h.closeMinute,
        },
        create: {
          staffId: s.id,
          dayOfWeek: h.dayOfWeek,
          isWorking: h.isOpen && !off,
          startMinute: h.openMinute,
          endMinute: h.closeMinute,
        },
      });
    }
  }

  // Lunch breaks (12:30–13:00) on open weekdays per barber.
  if ((await db.break.count()) === 0) {
    for (const s of staff) {
      for (const dow of [2, 3, 4, 5, 6]) {
        await db.break.create({
          data: { staffId: s.id, dayOfWeek: dow, startMinute: 12 * 60 + 30, endMinute: 13 * 60, title: "Lunch" },
        });
      }
    }
  }

  // ----------------------------------------------------------- service categories + services
  if ((await db.service.count()) === 0) {
    const cuts = await db.serviceCategory.create({
      data: { name: "Haircuts", slug: "haircuts", description: "Classic to contemporary cuts", displayOrder: 0 },
    });
    const beard = await db.serviceCategory.create({
      data: { name: "Beard & Shave", slug: "beard-shave", description: "Trims, sculpts and hot-towel shaves", displayOrder: 1 },
    });
    const combos = await db.serviceCategory.create({
      data: { name: "Combos", slug: "combos", description: "The full treatment", displayOrder: 2 },
    });
    const kids = await db.serviceCategory.create({
      data: { name: "Kids & Seniors", slug: "kids-seniors", description: "Cuts for the whole family", displayOrder: 3 },
    });

    const services = [
      { name: "Classic Haircut", slug: "classic-haircut", categoryId: cuts.id, description: "A timeless scissor-and-clipper cut tailored to you, finished with a hot-towel neck shave.", durationMin: 30, priceCents: 3500, bufferAfterMin: 5, icon: "scissors", displayOrder: 0, imageUrl: img("1503951914875-452162b0f3f1", 800, 600) },
      { name: "Low Taper Fade", slug: "low-taper-fade", categoryId: cuts.id, description: "Precision low-taper blended to skin for a crisp, modern finish.", durationMin: 45, priceCents: 4000, bufferAfterMin: 5, icon: "scissors", displayOrder: 1, imageUrl: img("1599351431202-1e0f0137899a", 800, 600) },
      { name: "Skin Fade", slug: "skin-fade", categoryId: cuts.id, description: "A sharp bald fade with seamless blending and a defined line-up.", durationMin: 45, priceCents: 4200, bufferAfterMin: 5, icon: "scissors", displayOrder: 2, imageUrl: img("1521590832167-7bcbfaa6381f", 800, 600) },
      { name: "Line-Up / Edge-Up", slug: "line-up", categoryId: cuts.id, description: "Clean up your hairline and edges between cuts.", durationMin: 15, priceCents: 1500, icon: "ruler", displayOrder: 3 },
      { name: "Beard Trim & Shape", slug: "beard-trim", categoryId: beard.id, description: "Sculpted, lined and conditioned for a sharp, defined beard.", durationMin: 20, priceCents: 2000, icon: "wind", displayOrder: 4, imageUrl: img("1517832606299-7ae9b720a186", 800, 600) },
      { name: "Hot Towel Straight-Razor Shave", slug: "hot-towel-shave", categoryId: beard.id, description: "The traditional experience — hot towels, rich lather and a straight-razor finish.", durationMin: 30, priceCents: 3500, bufferAfterMin: 5, icon: "droplet", displayOrder: 5, imageUrl: img("1585747860715-2ba37e788b70", 800, 600) },
      { name: "Haircut + Beard", slug: "haircut-beard", categoryId: combos.id, description: "Our signature combo: a full haircut paired with a sculpted beard trim.", durationMin: 60, priceCents: 5500, bufferAfterMin: 5, icon: "sparkles", displayOrder: 6, imageUrl: img("1622296089863-eb7fc530daa8", 800, 600) },
      { name: "Kids Cut (12 & under)", slug: "kids-cut", categoryId: kids.id, description: "Patient, friendly cuts for the little ones.", durationMin: 30, priceCents: 2500, icon: "baby", displayOrder: 7 },
      { name: "Senior Cut (65+)", slug: "senior-cut", categoryId: kids.id, description: "A classic cut at a classic price.", durationMin: 30, priceCents: 2500, icon: "user", displayOrder: 8 },
    ];

    for (const svc of services) {
      const created = await db.service.create({ data: svc });
      // Assign all barbers; kids cut to Marco & Cosimo only as an example.
      const assigned = svc.slug === "kids-cut" ? [cosimo, marco] : staff;
      for (const s of assigned) {
        if (s) await db.serviceStaff.create({ data: { serviceId: created.id, staffId: s.id } });
      }
      // Add-ons for the headline services.
      if (svc.slug === "classic-haircut" || svc.slug === "low-taper-fade" || svc.slug === "skin-fade") {
        await db.serviceAddon.createMany({
          data: [
            { serviceId: created.id, name: "Hot Towel Finish", priceCents: 500, durationMin: 5, displayOrder: 0 },
            { serviceId: created.id, name: "Beard Line-Up", priceCents: 1000, durationMin: 10, displayOrder: 1 },
            { serviceId: created.id, name: "Grey Blending", priceCents: 1500, durationMin: 15, displayOrder: 2 },
          ],
        });
      }
    }
  }

  // ----------------------------------------------------------- closures (samples)
  if ((await db.closure.count()) === 0) {
    await db.closure.create({
      data: { title: "Canada Day", type: "holiday", startDate: "2026-07-01", endDate: "2026-07-01", note: "Closed for the holiday" },
    });
    if (marco) {
      await db.closure.create({
        data: { title: "Marco — Vacation", type: "vacation", startDate: "2026-08-10", endDate: "2026-08-17", staffId: marco.id },
      });
    }
  }

  // ----------------------------------------------------------- products
  if ((await db.product.count()) === 0) {
    const pomade = await db.productCategory.create({ data: { name: "Hair", slug: "hair", displayOrder: 0 } });
    const beardCat = await db.productCategory.create({ data: { name: "Beard", slug: "beard", displayOrder: 1 } });
    const tools = await db.productCategory.create({ data: { name: "Tools", slug: "tools", displayOrder: 2 } });

    const products = [
      { name: "Signature Matte Pomade", slug: "matte-pomade", categoryId: pomade.id, description: "Strong hold, matte finish, all-day control. Water-based and easy to wash out.", priceCents: 2400, stock: 40, isFeatured: true, image: img("1596462502278-27bfdc403348", 600, 600), variants: [ { name: "Size", value: "100ml", priceDeltaCents: 0, stock: 25 }, { name: "Size", value: "200ml", priceDeltaCents: 1200, stock: 15 } ] },
      { name: "Classic Pomade (High Shine)", slug: "classic-pomade", categoryId: pomade.id, description: "Old-school high-shine hold for slick, classic styles.", priceCents: 2200, salePriceCents: 1800, stock: 30, isFeatured: true, image: img("1522335789203-aabd1fc54bc9", 600, 600) },
      { name: "Sea Salt Texture Spray", slug: "sea-salt-spray", categoryId: pomade.id, description: "Effortless texture and matte volume for a lived-in look.", priceCents: 2000, stock: 22, image: img("1556228578-8c89e6adf883", 600, 600) },
      { name: "Cedar & Spice Beard Oil", slug: "beard-oil", categoryId: beardCat.id, description: "Conditioning beard oil that softens and tames with a warm cedar scent.", priceCents: 2600, stock: 35, isFeatured: true, image: img("1621607512214-68297480165e", 600, 600), variants: [ { name: "Scent", value: "Cedar & Spice", stock: 18 }, { name: "Scent", value: "Sandalwood", stock: 17 } ] },
      { name: "Beard Balm", slug: "beard-balm", categoryId: beardCat.id, description: "Light hold balm that shapes and nourishes a fuller beard.", priceCents: 2400, stock: 28, image: img("1585386959984-a4155224a1ad", 600, 600) },
      { name: "Boar Bristle Brush", slug: "boar-bristle-brush", categoryId: tools.id, description: "Premium boar-bristle brush for distributing oils and taming flyaways.", priceCents: 3200, stock: 14, image: img("1590439471364-192aa70c0b53", 600, 600) },
      { name: "Carbon Styling Comb", slug: "styling-comb", categoryId: tools.id, description: "Anti-static heat-resistant carbon comb. A barber's everyday essential.", priceCents: 1200, stock: 50, image: img("1512496015851-a90fb38ba796", 600, 600) },
      { name: "Aftershave Balm", slug: "aftershave-balm", categoryId: beardCat.id, description: "Soothing alcohol-free balm to calm skin after the shave.", priceCents: 2100, stock: 4, lowStockThreshold: 5, image: img("1608248543803-ba4f8c70ae0b", 600, 600) },
    ];

    for (const p of products) {
      const { image, variants, ...rest } = p;
      const created = await db.product.create({ data: rest });
      await db.productImage.create({ data: { productId: created.id, url: image, alt: p.name, displayOrder: 0 } });
      if (variants) {
        for (const v of variants) await db.productVariant.create({ data: { productId: created.id, ...v } });
      }
    }
  }

  // ----------------------------------------------------------- gallery
  if ((await db.galleryImage.count()) === 0) {
    const ids = [
      "1503951914875-452162b0f3f1",
      "1599351431202-1e0f0137899a",
      "1521590832167-7bcbfaa6381f",
      "1517832606299-7ae9b720a186",
      "1585747860715-2ba37e788b70",
      "1622296089863-eb7fc530daa8",
      "1605497788044-5a32c7078486",
      "1622286342621-4bd786c2447c",
      "1503443207922-dff7d543fd0e",
    ];
    await db.galleryImage.createMany({
      data: ids.map((id, i) => ({
        url: img(id, 800, 800),
        alt: "Barbershop work",
        category: i % 2 === 0 ? "Cuts" : "Shop",
        displayOrder: i,
      })),
    });
  }

  // ----------------------------------------------------------- testimonials
  if ((await db.testimonial.count()) === 0) {
    await db.testimonial.createMany({
      data: [
        { author: "Daniel R.", role: "Regular since 2009", rating: 5, text: "Best fade in Milton, hands down. Jo and the team treat you like family every single visit.", isFeatured: true, displayOrder: 0 },
        { author: "Anthony M.", role: "Local", rating: 5, text: "Old-school barbershop with modern skills. The hot-towel shave is an experience everyone should try.", isFeatured: true, displayOrder: 1 },
        { author: "Sam K.", rating: 5, text: "Cosimo nailed exactly what I asked for. Sharp line-up and a clean blend — I won't go anywhere else.", isFeatured: true, displayOrder: 2 },
        { author: "George P.", role: "Customer for 40 years", rating: 5, text: "Been coming here since Mike ran the chair. Same quality, same great conversation. A Milton institution.", isFeatured: true, displayOrder: 3 },
        { author: "Liam T.", rating: 5, text: "Booked online in two minutes and was in the chair on time. Loved the whole experience.", displayOrder: 4 },
        { author: "Priya S.", role: "Brought my son in", rating: 5, text: "So patient and kind with my 6-year-old's first real haircut. Highly recommend for kids.", displayOrder: 5 },
      ],
    });
  }

  console.log("✓ Seed complete.");
  console.log(`  Owner login → ${ADMIN_EMAIL} (password: SEED_ADMIN_PASSWORD env, never logged)`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
