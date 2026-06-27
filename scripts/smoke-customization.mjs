// Smoke-test that owner-editable records feed public/dynamic booking and shop flows.
// This uses Prisma directly so it can be run without a browser, then restores data.
import { readFileSync } from "node:fs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const db = new PrismaClient();
let failures = 0;

const check = (cond, msg) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

function envFromFile(name) {
  if (process.env[name]) return process.env[name];
  const txt = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = txt.match(new RegExp(`^${name}="?([^"\\n]*)"?`, "m"));
  return m ? m[1] : "";
}

async function adminCookie() {
  const secret = new TextEncoder().encode(envFromFile("AUTH_SECRET"));
  const owner = await db.user.findFirst({ where: { role: "OWNER" } });
  if (!owner) throw new Error("No owner user - run the seed.");
  const token = await new SignJWT({ email: owner.email, name: owner.name, role: owner.role, staffId: owner.staffId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(owner.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  return `jm_session=${token}`;
}

async function revalidate(paths, cookie) {
  const res = await fetch(`${BASE}/api/admin/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ paths }),
  });
  const json = await res.json().catch(() => ({}));
  check(res.ok && json.ok, `Revalidated ${paths.join(", ")}`);
}

async function findAvailability(serviceId, staffId, startOffset = 2) {
  for (let i = startOffset; i <= startOffset + 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const json = await getJson(`${BASE}/api/availability?serviceId=${serviceId}&staffId=${staffId}&date=${key}`);
    if (json.ok && json.data.slots.length > 0) return { key, slots: json.data.slots };
  }
  return null;
}

async function main() {
  const service = await db.service.findFirst({
    where: { isActive: true, isBookable: true, staff: { some: {} } },
    include: { staff: true },
    orderBy: { displayOrder: "asc" },
  });
  const staff = await db.staff.findFirst({ where: { isActive: true, acceptsBookings: true }, include: { services: true } });
  const product = await db.product.findFirst({ where: { isActive: true }, include: { images: true } });
  const gallery = await db.galleryImage.findFirst({ where: { isActive: true } });
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });

  if (!service || !staff || !product || !settings) throw new Error("Seeded service, staff, product, and settings are required.");
  const cookie = await adminCookie();

  const originals = {
    service: {
      id: service.id,
      priceCents: service.priceCents,
      isBookable: service.isBookable,
      showOnServicesPage: service.showOnServicesPage,
    },
    staff: {
      id: staff.id,
      isActive: staff.isActive,
      acceptsBookings: staff.acceptsBookings,
      showOnPublicSite: staff.showOnPublicSite,
    },
    product: {
      id: product.id,
      name: product.name,
      isActive: product.isActive,
    },
    gallery: gallery
      ? {
          id: gallery.id,
          title: gallery.title,
          isFeatured: gallery.isFeatured,
          isActive: gallery.isActive,
        }
      : null,
    settings: {
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      heroHeadline: settings.heroHeadline,
      allowAnyBarber: settings.allowAnyBarber,
    },
  };

  try {
    await db.service.update({
      where: { id: service.id },
      data: { priceCents: service.priceCents + 123, isBookable: true, showOnServicesPage: true },
    });
    const bookHtml = await (await fetch(`${BASE}/book?service=${service.slug}`)).text();
    check(bookHtml.includes(service.name), "Booking flow includes edited service");
    check(bookHtml.includes(String(service.priceCents + 123)) || bookHtml.includes(((service.priceCents + 123) / 100).toFixed(2)), "Booking flow receives edited service price");

    const staffService = staff.services[0] ?? (await db.serviceStaff.create({ data: { staffId: staff.id, serviceId: service.id } }));
    await db.staff.update({ where: { id: staff.id }, data: { isActive: true, acceptsBookings: true, showOnPublicSite: true } });
    let availability = await findAvailability(staffService.serviceId, staff.id);
    check(Boolean(availability), "Active bookable barber has availability");
    await db.staff.update({ where: { id: staff.id }, data: { acceptsBookings: false } });
    availability = await findAvailability(staffService.serviceId, staff.id);
    check(!availability, "Barber removed from availability when booking visibility is off");
    await db.staff.update({ where: { id: staff.id }, data: { acceptsBookings: true } });

    await db.siteSettings.update({
      where: { id: "singleton" },
      data: {
        phone: "905-555-0198",
        email: "custom-test@josephandmikes.com",
        address: "999 Custom Test Street",
        heroHeadline: "Custom Smoke Hero",
        allowAnyBarber: false,
      },
    });
    const bookingHtml = await (await fetch(`${BASE}/book`)).text();
    check(!bookingHtml.includes("Any available barber"), "Booking flow hides Any available barber when disabled");

    await db.product.update({ where: { id: product.id }, data: { name: `${product.name} Smoke Test`, isActive: true } });
    await revalidate(["/shop", "/"], cookie);
    const shopHtml = await (await fetch(`${BASE}/shop`)).text();
    check(shopHtml.includes("Smoke Test"), "Shop page reflects edited product");

    if (gallery) {
      await db.galleryImage.update({ where: { id: gallery.id }, data: { title: "Smoke Test Gallery Image", isFeatured: true, isActive: true } });
      await revalidate(["/gallery", "/"], cookie);
      const galleryHtml = await (await fetch(`${BASE}/gallery`)).text();
      check(galleryHtml.includes("Smoke Test Gallery Image") || galleryHtml.includes(gallery.url), "Gallery page reflects edited image record");
    }
  } finally {
    await db.service.update({
      where: { id: originals.service.id },
      data: {
        priceCents: originals.service.priceCents,
        isBookable: originals.service.isBookable,
        showOnServicesPage: originals.service.showOnServicesPage,
      },
    });
    await db.staff.update({
      where: { id: originals.staff.id },
      data: {
        isActive: originals.staff.isActive,
        acceptsBookings: originals.staff.acceptsBookings,
        showOnPublicSite: originals.staff.showOnPublicSite,
      },
    });
    await db.product.update({
      where: { id: originals.product.id },
      data: { name: originals.product.name, isActive: originals.product.isActive },
    });
    if (originals.gallery) {
      await db.galleryImage.update({
        where: { id: originals.gallery.id },
        data: {
          title: originals.gallery.title,
          isFeatured: originals.gallery.isFeatured,
          isActive: originals.gallery.isActive,
        },
      });
    }
    await db.siteSettings.update({ where: { id: "singleton" }, data: originals.settings });
    await revalidate(["/", "/shop", "/gallery", "/book"], cookie);
  }

  console.log(`\n${failures === 0 ? "CUSTOMIZATION FLOW OK ✓" : failures + " CUSTOMIZATION CHECK(S) FAILED ✗"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
