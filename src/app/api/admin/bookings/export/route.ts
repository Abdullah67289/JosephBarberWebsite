import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession, sessionHasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { bookingInclude } from "@/lib/booking-service";
import { formatInTz } from "@/lib/time";
import { centsToDollars } from "@/lib/money";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  let s = String(v ?? "");
  // Neutralize spreadsheet formula injection: customer-supplied values that
  // start with = + - @ would otherwise execute when the CSV opens in Excel.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });
  // Same gate as the bookings page; barbers are scoped to their own chair.
  if (!(await sessionHasPermission(session, "manage_bookings"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const where: Prisma.BookingWhereInput = {};
  const status = sp.get("status");
  const barber = sp.get("barber");
  const date = sp.get("date");
  const q = sp.get("q");
  if (status && status !== "all") where.status = status;
  if (session.role === "BARBER") where.staffId = session.staffId ?? "__none";
  else if (barber && barber !== "all") where.staffId = barber;
  if (date) where.date = date;
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { email: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  const [bookings, settings] = await Promise.all([
    db.booking.findMany({ where, include: bookingInclude, orderBy: { startAt: "desc" }, take: 5000 }),
    getSettings(),
  ]);
  const tz = settings.timezone;

  const header = ["Reference", "Date", "Time", "Status", "Service", "Barber", "Customer", "Email", "Phone", "Price", "Source", "Notes"];
  const rows = bookings.map((b) =>
    [
      b.reference,
      formatInTz(b.startAt, tz, "yyyy-MM-dd"),
      formatInTz(b.startAt, tz, "h:mm a"),
      b.status,
      b.service.name,
      b.staff?.name ?? "Any",
      b.customer.name,
      b.customer.email,
      b.customer.phone,
      centsToDollars(b.priceCents).toFixed(2),
      b.source,
      b.notes ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
  const filename = `bookings-${formatInTz(new Date(), tz, "yyyy-MM-dd")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
