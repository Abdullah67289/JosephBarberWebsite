import { db } from "./db";
import { getSettings } from "./settings";
import {
  resolveWorkingWindow,
  computeStaffDaySlots,
  aggregateStaffSlots,
  type ExistingBooking,
  type MinuteInterval,
} from "./availability";
import {
  todayKey,
  addDaysKey,
  dayOfWeek,
  dayKey,
  localMinutesToUtc,
  minutesToLabel,
  isDateKeyInRange,
} from "./time";
import { generateBookingReference, generateManageToken } from "./tokens";
import type { Prisma } from "@prisma/client";

/** Statuses that occupy a barber's time (block the slot). */
const BLOCKING_STATUSES = ["pending", "confirmed", "completed", "rescheduled"];

export class BookingError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BookingError";
  }
}

export interface SlotDTO {
  startMinute: number;
  label: string;
  startISO: string;
  endISO: string;
  availableStaffIds: string[];
}

export interface AvailabilityResult {
  date: string;
  serviceId: string;
  durationMin: number;
  slots: SlotDTO[];
}

// ----------------------------------------------------------------- helpers

async function loadServiceWithDuration(serviceId: string, addonIds: string[]) {
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: { addons: true, staff: true },
  });
  if (!service || !service.isActive || !service.isBookable) {
    throw new BookingError("service_not_found", "That service is no longer available.");
  }
  const addons = service.addons.filter((a) => a.isActive && addonIds.includes(a.id));
  const addonDuration = addons.reduce((sum, a) => sum + a.durationMin, 0);
  const addonCents = addons.reduce((sum, a) => sum + a.priceCents, 0);
  return {
    service,
    addons,
    totalDuration: service.durationMin + addonDuration,
    addonCents,
  };
}

function rangesContainDate(
  ranges: { startDate: string; endDate: string }[],
  date: string,
): boolean {
  return ranges.some((r) => isDateKeyInRange(date, r.startDate, r.endDate));
}

function toMinuteIntervals(
  breaks: { startMinute: number; endMinute: number }[],
): MinuteInterval[] {
  return breaks.map((b) => ({ start: b.startMinute, end: b.endMinute }));
}

function cleanNullable(value?: string | null): string | null {
  const cleaned = (value ?? "").trim();
  return cleaned.length ? cleaned : null;
}

function normalizePhone(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length ? digits : null;
}

// ----------------------------------------------------------------- availability

export async function getAvailability(params: {
  serviceId: string;
  staffId?: string | null;
  date: string;
  addonIds?: string[];
  ignoreBookingId?: string;
  durationOverrideMin?: number;
  bufferBeforeOverrideMin?: number;
  bufferAfterOverrideMin?: number;
}): Promise<AvailabilityResult> {
  const settings = await getSettings();
  const tz = settings.timezone;
  const { date } = params;

  // Bounds: not in the past, within the max advance window.
  const today = todayKey(tz);
  const maxKey = addDaysKey(today, settings.maxAdvanceDays, tz);
  if (date < today || date > maxKey) {
    return { date, serviceId: params.serviceId, durationMin: 0, slots: [] };
  }

  const loaded = await loadServiceWithDuration(
    params.serviceId,
    params.addonIds ?? [],
  );
  const { service } = loaded;
  const totalDuration = params.durationOverrideMin ?? loaded.totalDuration;
  const bufferBeforeMin = params.bufferBeforeOverrideMin ?? service.bufferBeforeMin;
  const bufferAfterMin = params.bufferAfterOverrideMin ?? service.bufferAfterMin;

  // Eligible staff = active, accepting bookings, assigned to the service.
  let eligibleStaff = service.staff
    .map((s) => s.staffId)
    .length
    ? await db.staff.findMany({
        where: {
          isActive: true,
          acceptsBookings: true,
          services: { some: { serviceId: service.id } },
          ...(params.staffId ? { id: params.staffId } : {}),
        },
        include: { hours: true, breaks: true, closures: true, specialHours: true },
      })
    : [];

  if (eligibleStaff.length === 0) {
    return { date, serviceId: service.id, durationMin: totalDuration, slots: [] };
  }

  const dow = dayOfWeek(date, tz);
  const businessHour = (await db.businessHour.findUnique({ where: { dayOfWeek: dow } })) ?? undefined;

  // Shop-wide overrides.
  const shopBreaks = await db.break.findMany({ where: { staffId: null, dayOfWeek: dow } });
  const shopClosures = await db.closure.findMany({ where: { staffId: null } });
  const shopClosed = rangesContainDate(shopClosures, date);
  const shopSpecial = await db.specialHour.findFirst({ where: { staffId: null, date } });

  // Earliest allowed start = now + minimum notice.
  const minStartUtc = new Date(Date.now() + settings.minNoticeMin * 60_000);

  const perStaff: Record<string, ReturnType<typeof computeStaffDaySlots>> = {};

  for (const staff of eligibleStaff) {
    const staffHour = staff.hours.find((h) => h.dayOfWeek === dow);
    const staffSpecial = staff.specialHours.find((s) => s.date === date);
    const staffClosed = rangesContainDate(staff.closures, date);

    const window = resolveWorkingWindow({
      businessHour: businessHour
        ? { isOpen: businessHour.isOpen, openMinute: businessHour.openMinute, closeMinute: businessHour.closeMinute }
        : undefined,
      staffHour: staffHour
        ? { isWorking: staffHour.isWorking, startMinute: staffHour.startMinute, endMinute: staffHour.endMinute }
        : undefined,
      shopSpecialHour: shopSpecial
        ? { isClosed: shopSpecial.isClosed, openMinute: shopSpecial.openMinute, closeMinute: shopSpecial.closeMinute }
        : undefined,
      staffSpecialHour: staffSpecial
        ? { isClosed: staffSpecial.isClosed, openMinute: staffSpecial.openMinute, closeMinute: staffSpecial.closeMinute }
        : undefined,
      shopClosed,
      staffClosed,
    });
    if (!window) {
      perStaff[staff.id] = [];
      continue;
    }

    // Breaks = shop-wide + this staff's, for the weekday.
    const staffBreaks = staff.breaks.filter((b) => b.dayOfWeek === dow);
    const breaks = toMinuteIntervals([...shopBreaks, ...staffBreaks]);

    // Existing bookings for this staff on the date that block time.
    const dayStart = localMinutesToUtc(date, 0, tz);
    const dayEnd = localMinutesToUtc(addDaysKey(date, 1, tz), 0, tz);
    const existing = await db.booking.findMany({
      where: {
        staffId: staff.id,
        status: { in: BLOCKING_STATUSES },
        ...(params.ignoreBookingId ? { id: { not: params.ignoreBookingId } } : {}),
        startAt: { gte: new Date(dayStart.getTime() - 4 * 3600_000), lt: dayEnd },
      },
      select: { startAt: true, endAt: true, bufferBeforeMin: true, bufferAfterMin: true },
    });
    const bookings: ExistingBooking[] = existing.map((b) => ({
      startAt: b.startAt,
      endAt: b.endAt,
      bufferBeforeMin: b.bufferBeforeMin,
      bufferAfterMin: b.bufferAfterMin,
    }));

    perStaff[staff.id] = computeStaffDaySlots({
      dateKey: date,
      tz,
      slotIntervalMin: settings.slotIntervalMin,
      serviceDurationMin: totalDuration,
      bufferBeforeMin,
      bufferAfterMin,
      workingWindow: window,
      breaks,
      bookings,
      minStartUtc,
    });
  }

  const aggregated = aggregateStaffSlots(perStaff);
  const slots: SlotDTO[] = aggregated.map((s) => ({
    startMinute: s.startMinute,
    label: minutesToLabel(s.startMinute),
    startISO: s.startAt.toISOString(),
    endISO: s.endAt.toISOString(),
    availableStaffIds: s.availableStaffIds,
  }));

  return { date, serviceId: service.id, durationMin: totalDuration, slots };
}

// ----------------------------------------------------------------- conflict check (tx)

async function staffHasConflict(
  tx: Prisma.TransactionClient,
  staffId: string,
  startAt: Date,
  endAt: Date,
  bufferBeforeMin: number,
  bufferAfterMin: number,
  ignoreBookingId?: string,
): Promise<boolean> {
  const occStart = new Date(startAt.getTime() - bufferBeforeMin * 60_000);
  const occEnd = new Date(endAt.getTime() + bufferAfterMin * 60_000);

  // Fetch candidate-overlapping bookings (widened by a safe 4h buffer pad) and
  // apply the exact overlap rule in JS including each booking's own buffers.
  const nearby = await tx.booking.findMany({
    where: {
      staffId,
      status: { in: BLOCKING_STATUSES },
      ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
      startAt: { lt: new Date(occEnd.getTime() + 4 * 3600_000) },
      endAt: { gt: new Date(occStart.getTime() - 4 * 3600_000) },
    },
    select: { startAt: true, endAt: true, bufferBeforeMin: true, bufferAfterMin: true },
  });

  return nearby.some((b) => {
    const bStart = b.startAt.getTime() - b.bufferBeforeMin * 60_000;
    const bEnd = b.endAt.getTime() + b.bufferAfterMin * 60_000;
    return occStart.getTime() < bEnd && occEnd.getTime() > bStart;
  });
}

async function upsertCustomer(
  tx: Prisma.TransactionClient,
  input: {
    name: string;
    email: string | null;
    phone: string | null;
    normalizedPhone: string | null;
    marketing?: boolean;
  },
) {
  const update = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    normalizedPhone: input.normalizedPhone,
    ...(input.marketing != null ? { marketing: input.marketing } : {}),
  };

  if (input.email) {
    return tx.customer.upsert({
      where: { email: input.email },
      update,
      create: {
        ...update,
        marketing: input.marketing ?? false,
      },
    });
  }

  if (input.normalizedPhone) {
    const existing = await tx.customer.findFirst({ where: { normalizedPhone: input.normalizedPhone } });
    if (existing) {
      return tx.customer.update({ where: { id: existing.id }, data: update });
    }
  }

  return tx.customer.create({
    data: {
      ...update,
      marketing: input.marketing ?? false,
    },
  });
}

// ----------------------------------------------------------------- create

export interface CreateBookingInput {
  serviceId: string;
  staffId?: string | null;
  date: string;
  startMinute: number;
  addonIds?: string[];
  customer: { name?: string | null; email?: string | null; phone?: string | null; notes?: string; marketing?: boolean };
  source?: "online" | "admin" | "walk_in";
  status?: string;
  internalNotes?: string;
}

export async function createBooking(input: CreateBookingInput) {
  const settings = await getSettings();
  const tz = settings.timezone;
  const email = cleanNullable(input.customer.email);
  const phone = cleanNullable(input.customer.phone);
  const normalizedPhone = normalizePhone(phone);
  const customerName = cleanNullable(input.customer.name) ?? "Guest";
  const notes = cleanNullable(input.customer.notes);

  if (settings.requireCustomerName && customerName === "Guest") {
    throw new BookingError("customer_required", "Please enter the customer's name.");
  }
  if (settings.requireCustomerEmail && !email) {
    throw new BookingError("customer_required", "Please enter an email address.");
  }
  if (settings.requireCustomerPhone && !phone) {
    throw new BookingError("customer_required", "Please enter a phone number.");
  }
  if (settings.requireCustomerNotes && !notes) {
    throw new BookingError("customer_required", "Please add a note for this booking.");
  }
  if (!email && !phone) {
    throw new BookingError("customer_required", "Please enter a phone number or email address.");
  }

  const { service, addons, totalDuration, addonCents } = await loadServiceWithDuration(
    input.serviceId,
    input.addonIds ?? [],
  );

  // Confirm the requested slot is genuinely offered (hours/breaks/closures/notice).
  const availability = await getAvailability({
    serviceId: input.serviceId,
    staffId: input.staffId ?? undefined,
    date: input.date,
    addonIds: input.addonIds ?? [],
  });
  const offered = availability.slots.find((s) => s.startMinute === input.startMinute);
  if (!offered) {
    throw new BookingError("slot_unavailable", "That time is no longer available. Please pick another.");
  }

  // Ordered list of barbers who can take this slot.
  const candidateStaffIds = input.staffId ? [input.staffId] : offered.availableStaffIds;
  if (candidateStaffIds.length === 0) {
    throw new BookingError("slot_unavailable", "That time is no longer available. Please pick another.");
  }

  const startAt = localMinutesToUtc(input.date, input.startMinute, tz);
  const endAt = localMinutesToUtc(input.date, input.startMinute + totalDuration, tz);
  const reference = generateBookingReference();
  const manageToken = generateManageToken();

  const priceCents = service.priceCents + addonCents;
  const depositCents = settings.depositRequired ? service.depositCents : 0;

  // Transaction with conflict re-check guarantees no double-booking even under
  // concurrent submissions (SQLite serialises writes; Postgres uses Serializable).
  const booking = await runSerializable(async (tx) => {
    let chosenStaffId: string | null = null;
    for (const staffId of candidateStaffIds) {
      const conflict = await staffHasConflict(
        tx,
        staffId,
        startAt,
        endAt,
        service.bufferBeforeMin,
        service.bufferAfterMin,
      );
      if (!conflict) {
        chosenStaffId = staffId;
        break;
      }
    }
    if (!chosenStaffId) {
      throw new BookingError("slot_taken", "That time was just booked. Please choose another slot.");
    }

    const customer = await upsertCustomer(tx, {
      name: customerName,
      email,
      phone,
      normalizedPhone,
      marketing: input.customer.marketing,
    });

    return tx.booking.create({
      data: {
        reference,
        manageToken,
        status: input.status ?? "confirmed",
        customerId: customer.id,
        serviceId: service.id,
        staffId: chosenStaffId,
        startAt,
        endAt,
        bufferBeforeMin: service.bufferBeforeMin,
        bufferAfterMin: service.bufferAfterMin,
        date: input.date,
        priceCents,
        depositCents,
        addonsCents: addonCents,
        notes,
        internalNotes: input.internalNotes || null,
        source: input.source ?? "online",
        addons: {
          create: addons.map((a) => ({
            name: a.name,
            priceCents: a.priceCents,
            durationMin: a.durationMin,
          })),
        },
        events: {
          create: {
            type: "created",
            message: `Booking created via ${input.source ?? "online"}`,
            actor: input.source === "online" ? "customer" : "admin",
          },
        },
      },
      include: bookingInclude,
    });
  });

  return booking;
}

// ----------------------------------------------------------------- reschedule

export async function rescheduleBooking(
  bookingId: string,
  input: { date: string; startMinute: number; staffId?: string | null },
  actor: string,
) {
  const settings = await getSettings();
  const tz = settings.timezone;

  const current = await db.booking.findUnique({
    where: { id: bookingId },
    include: { addons: true, service: true },
  });
  if (!current) throw new BookingError("not_found", "Booking not found.");

  // Addons are preserved as snapshots on the booking; their duration still
  // counts toward the rescheduled service length.
  const addonDuration = current.addons.reduce((s, a) => s + a.durationMin, 0);
  const totalDuration = current.service.durationMin + addonDuration;

  const targetStaffId =
    input.staffId === undefined ? current.staffId ?? undefined : input.staffId ?? undefined;

  // Re-validate availability ignoring the current booking.
  const availability = await getAvailability({
    serviceId: current.serviceId,
    staffId: targetStaffId,
    date: input.date,
    addonIds: [],
    ignoreBookingId: bookingId,
    durationOverrideMin: totalDuration,
    bufferBeforeOverrideMin: current.bufferBeforeMin,
    bufferAfterOverrideMin: current.bufferAfterMin,
  });
  // The current booking blocks its own old slot; allow rescheduling into a slot
  // that is free once we ignore this booking.
  const startAt = localMinutesToUtc(input.date, input.startMinute, tz);
  const endAt = localMinutesToUtc(input.date, input.startMinute + totalDuration, tz);
  const offered = availability.slots.find((s) => s.startMinute === input.startMinute);
  if (!offered) {
    throw new BookingError("slot_unavailable", "That time isn't available. Please pick another.");
  }

  const booking = await runSerializable(async (tx) => {
    const candidateStaffIds = targetStaffId ? [targetStaffId] : offered.availableStaffIds;
    if (candidateStaffIds.length === 0) {
      throw new BookingError("slot_unavailable", "That time isn't available. Please pick another.");
    }

    let chosenStaffId: string | null = null;
    for (const staffId of candidateStaffIds) {
      const conflict = await staffHasConflict(
        tx,
        staffId,
        startAt,
        endAt,
        current.bufferBeforeMin,
        current.bufferAfterMin,
        bookingId,
      );
      if (!conflict) {
        chosenStaffId = staffId;
        break;
      }
    }
    if (!chosenStaffId) {
      throw new BookingError("slot_taken", "That time was just booked. Please choose another slot.");
    }

    return tx.booking.update({
      where: { id: bookingId },
      data: {
        date: input.date,
        startAt,
        endAt,
        staffId: chosenStaffId,
        status: current.status === "cancelled" ? "confirmed" : current.status,
        events: {
          create: {
            type: "rescheduled",
            message: `Rescheduled to ${input.date} ${minutesToLabel(input.startMinute)}`,
            actor,
            meta: JSON.stringify({ from: current.startAt.toISOString(), to: startAt.toISOString() }),
          },
        },
      },
      include: bookingInclude,
    });
  });

  return booking;
}

// ----------------------------------------------------------------- cancel

export async function cancelBooking(bookingId: string, actor: string, reason?: string) {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingError("not_found", "Booking not found.");
  if (booking.status === "cancelled") return db.booking.findUnique({ where: { id: bookingId }, include: bookingInclude });

  return db.booking.update({
    where: { id: bookingId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
      events: {
        create: {
          type: "cancelled",
          message: reason ? `Cancelled: ${reason}` : "Booking cancelled",
          actor,
        },
      },
    },
    include: bookingInclude,
  });
}

// ----------------------------------------------------------------- helpers

export const bookingInclude = {
  service: true,
  staff: true,
  customer: true,
  addons: true,
} satisfies Prisma.BookingInclude;

export async function getBookingByToken(token: string) {
  return db.booking.findUnique({ where: { manageToken: token }, include: bookingInclude });
}

/** True when the customer is still allowed to self-edit (outside cutoff window). */
export async function canCustomerModify(startAt: Date): Promise<{ allowed: boolean; cutoffHours: number }> {
  const settings = await getSettings();
  const cutoffMs = settings.cancellationCutoffHours * 3600_000;
  const allowed = startAt.getTime() - Date.now() > cutoffMs;
  return { allowed, cutoffHours: settings.cancellationCutoffHours };
}

/** Run a function inside a Serializable transaction, retrying write conflicts. */
async function runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (err) {
      if (err instanceof BookingError) throw err;
      lastErr = err;
      // Prisma write-conflict / serialization failure -> retry.
      const code = (err as { code?: string }).code;
      if (code === "P2034") continue;
      throw err;
    }
  }
  throw lastErr;
}

export { dayKey };
