import { type NextRequest } from "next/server";
import { bookingRescheduleSchema } from "@/lib/validation";
import {
  getBookingByToken,
  rescheduleBooking,
  canCustomerModify,
  bookingInclude,
} from "@/lib/booking-service";
import { notifyBookingRescheduled } from "@/lib/notifications";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const booking = await getBookingByToken(token);
    if (!booking) return fail("Booking not found.", 404);
    if (booking.status === "cancelled") return fail("This booking has been cancelled.", 409);

    const mod = await canCustomerModify(booking.startAt);
    if (!mod.allowed) {
      return fail(
        `Changes must be made at least ${mod.cutoffHours} hours before your appointment. Please call us.`,
        403,
      );
    }

    const input = bookingRescheduleSchema.parse(await req.json());
    const updated = await rescheduleBooking(
      booking.id,
      { date: input.date, startMinute: input.startMinute, staffId: input.staffId === "any" ? null : input.staffId },
      "customer",
    );

    const full = await db.booking.findUnique({ where: { id: updated!.id }, include: bookingInclude });
    if (full) void notifyBookingRescheduled(full);

    return ok({ reference: updated!.reference });
  } catch (err) {
    return handleError(err);
  }
}
