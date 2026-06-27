import { type NextRequest } from "next/server";
import {
  getBookingByToken,
  cancelBooking,
  canCustomerModify,
  bookingInclude,
} from "@/lib/booking-service";
import { notifyBookingCancelled, notifyAdminCancellation } from "@/lib/notifications";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const booking = await getBookingByToken(token);
    if (!booking) return fail("Booking not found.", 404);
    if (booking.status === "cancelled") return ok({ reference: booking.reference });

    const mod = await canCustomerModify(booking.startAt);
    if (!mod.allowed) {
      return fail(
        `Cancellations must be made at least ${mod.cutoffHours} hours before your appointment. Please call us.`,
        403,
      );
    }

    await cancelBooking(booking.id, "customer");

    const full = await db.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });
    if (full) {
      void notifyBookingCancelled(full);
      void notifyAdminCancellation(full);
    }

    return ok({ reference: booking.reference });
  } catch (err) {
    return handleError(err);
  }
}
