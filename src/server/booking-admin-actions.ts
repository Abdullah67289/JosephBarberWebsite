"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminBookingCreateSchema, adminBookingUpdateSchema, BOOKING_STATUSES } from "@/lib/validation";
import {
  createBooking,
  rescheduleBooking,
  cancelBooking,
  bookingInclude,
} from "@/lib/booking-service";
import {
  notifyBookingConfirmation,
  notifyBookingRescheduled,
  notifyBookingCancelled,
  notifyAdminCancellation,
} from "@/lib/notifications";
import { guard, actionOk, actionError, toActionError, type ActionResult } from "./_helpers";

function revalidateBookings() {
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

function cleanNullable(value?: string | null): string | null {
  const cleaned = (value ?? "").trim();
  return cleaned.length ? cleaned : null;
}

function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length ? digits : null;
}

async function bookingBelongsToSession(bookingId: string, staffId: string | null | undefined) {
  if (!staffId) return false;
  const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { staffId: true } });
  return booking?.staffId === staffId;
}

export async function adminCreateBooking(raw: unknown): Promise<ActionResult> {
  const session = await guard("BARBER");
  try {
    const data = adminBookingCreateSchema.parse(raw);
    if (session.role === "BARBER" && (!session.staffId || (data.staffId && data.staffId !== session.staffId))) {
      return actionError("You can only create bookings for your own chair.");
    }
    const booking = await createBooking({
      serviceId: data.serviceId,
      staffId: session.role === "BARBER" ? session.staffId : data.staffId === "any" ? undefined : data.staffId,
      date: data.date,
      startMinute: data.startMinute,
      addonIds: data.addonIds,
      customer: data.customer,
      source: data.source,
      status: data.status,
      internalNotes: data.internalNotes,
    });
    const full = await db.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });
    if (full && data.status !== "completed") void notifyBookingConfirmation(full);
    void session;
    revalidateBookings();
    return actionOk({ id: booking.id, reference: booking.reference });
  } catch (err) {
    return toActionError(err);
  }
}

export async function adminSetBookingStatus(id: string, status: string): Promise<ActionResult> {
  const session = await guard("BARBER");
  if (!BOOKING_STATUSES.includes(status as never)) return actionError("Invalid status.");
  try {
    if (session.role === "BARBER" && !(await bookingBelongsToSession(id, session.staffId))) {
      return actionError("You can only update your own bookings.");
    }
    if (status === "cancelled") {
      await cancelBooking(id, session.email);
      const full = await db.booking.findUnique({ where: { id }, include: bookingInclude });
      if (full) {
        void notifyBookingCancelled(full);
        void notifyAdminCancellation(full);
      }
    } else {
      await db.booking.update({
        where: { id },
        data: {
          status,
          events: { create: { type: status, message: `Marked ${status.replace("_", " ")}`, actor: session.email } },
        },
      });
    }
    revalidateBookings();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function adminRescheduleBooking(
  id: string,
  input: { date: string; startMinute: number; staffId?: string | null },
): Promise<ActionResult> {
  const session = await guard("BARBER");
  try {
    if (session.role === "BARBER") {
      if (!(await bookingBelongsToSession(id, session.staffId))) {
        return actionError("You can only reschedule your own bookings.");
      }
      if (!session.staffId || (input.staffId && input.staffId !== "any" && input.staffId !== session.staffId)) {
        return actionError("You can only reschedule into your own chair.");
      }
    }
    const updated = await rescheduleBooking(
      id,
      { date: input.date, startMinute: input.startMinute, staffId: session.role === "BARBER" ? session.staffId : input.staffId === "any" ? null : input.staffId },
      session.email,
    );
    const full = await db.booking.findUnique({ where: { id: updated!.id }, include: bookingInclude });
    if (full) void notifyBookingRescheduled(full);
    revalidateBookings();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function adminUpdateBooking(id: string, raw: unknown): Promise<ActionResult> {
  const session = await guard("BARBER");
  try {
    const data = adminBookingUpdateSchema.parse(raw);
    const current = await db.booking.findUnique({ where: { id }, include: { customer: true } });
    if (!current) return actionError("Booking not found.");
    if (session.role === "BARBER") {
      if (current.staffId !== session.staffId) return actionError("You can only update your own bookings.");
      if (data.staffId && data.staffId !== "any" && data.staffId !== session.staffId) {
        return actionError("You can only assign your own chair.");
      }
    }

    await db.$transaction(async (tx) => {
      if (data.customer) {
        const nextEmail =
          data.customer.email !== undefined ? cleanNullable(data.customer.email) : current.customer.email;
        const nextPhone =
          data.customer.phone !== undefined ? cleanNullable(data.customer.phone) : current.customer.phone;
        if (!nextEmail && !nextPhone) {
          throw new Error("Customer needs a phone number or email address.");
        }
        await tx.customer.update({
          where: { id: current.customerId },
          data: {
            ...(data.customer.name !== undefined ? { name: data.customer.name || "Guest" } : {}),
            ...(data.customer.email !== undefined ? { email: nextEmail } : {}),
            ...(data.customer.phone !== undefined ? { phone: nextPhone, normalizedPhone: normalizePhone(nextPhone) } : {}),
            ...(data.customer.notes !== undefined ? { notes: data.customer.notes || null } : {}),
          },
        });
      }

      await tx.booking.update({
        where: { id },
        data: {
          ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.staffId !== undefined
            ? { staffId: session.role === "BARBER" ? session.staffId : data.staffId === "any" ? null : data.staffId }
            : {}),
          events: { create: { type: "updated", message: "Booking details updated", actor: session.email } },
        },
      });
    });
    revalidateBookings();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function adminDeleteBooking(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.booking.delete({ where: { id } });
    revalidateBookings();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
