import { type NextRequest } from "next/server";
import { bookingCreateSchema } from "@/lib/validation";
import { createBooking, bookingInclude } from "@/lib/booking-service";
import {
  notifyBookingConfirmation,
  notifyAdminNewBooking,
} from "@/lib/notifications";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, handleError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const limit = rateLimit(`book:${ip}`, 8, 60_000); // 8 bookings / minute / IP
    if (!limit.success) {
      return fail("Too many requests. Please wait a moment and try again.", 429);
    }

    const body = await req.json();
    const input = bookingCreateSchema.parse(body);

    const booking = await createBooking({
      serviceId: input.serviceId,
      staffId: input.staffId === "any" ? undefined : input.staffId,
      date: input.date,
      startMinute: input.startMinute,
      addonIds: input.addonIds,
      customer: input.customer,
      source: "online",
      status: "confirmed",
    });

    // Fire notifications (don't block the response on provider latency).
    const full = await db.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });
    if (full) {
      void notifyBookingConfirmation(full);
      void notifyAdminNewBooking(full);
    }

    return ok({
      reference: booking.reference,
      manageToken: booking.manageToken,
      id: booking.id,
    });
  } catch (err) {
    return handleError(err);
  }
}
