import { localMinutesToUtc, rangesOverlap } from "./time";

/**
 * ============================================================================
 *  AVAILABILITY ENGINE  (pure, unit-tested — no DB access)
 * ============================================================================
 *
 *  Booking model
 *  -------------
 *  A booking begins at instant T (the moment the customer's service starts).
 *    • The SERVICE occupies         [T, T + duration]
 *    • Buffers add spacing so the staff's OCCUPIED interval is
 *                                    [T - bufferBefore, T + duration + bufferAfter]
 *
 *  Rules enforced
 *  --------------
 *    • The service window [T, T+duration] must fit inside the resolved working
 *      window for that staff on that day and must not overlap a break.
 *    • Buffers only affect spacing between neighbouring bookings (they may
 *      legitimately extend past closing / before opening — e.g. cleanup time).
 *    • A candidate conflicts with an existing booking iff their buffer-expanded
 *      occupied intervals overlap:  aStart < bEnd && aEnd > bStart.
 *    • A start is invalid if it is earlier than `minStartUtc` (now + min-notice).
 *
 *  All wall-clock inputs are minutes-from-midnight in the shop timezone; all
 *  absolute instants are UTC Dates.
 */

/** A half-open interval in shop-local minutes from midnight. */
export interface MinuteInterval {
  start: number;
  end: number;
}

export interface DayWindow {
  isOpen: boolean;
  openMinute: number;
  closeMinute: number;
}

export interface DaySchedule {
  isWorking: boolean;
  startMinute: number;
  endMinute: number;
}

export interface SpecialHourOverride {
  isClosed: boolean;
  openMinute?: number | null;
  closeMinute?: number | null;
}

/** An existing booking expressed as service start/end (UTC) plus its buffers. */
export interface ExistingBooking {
  startAt: Date;
  endAt: Date;
  bufferBeforeMin: number;
  bufferAfterMin: number;
}

export interface Slot {
  startMinute: number;
  startAt: Date;
  endAt: Date;
}

const MS_PER_MIN = 60_000;

// ----------------------------------------------------------------- interval math

export function minuteRangesOverlap(a: MinuteInterval, b: MinuteInterval): boolean {
  return a.start < b.end && a.end > b.start;
}

export function intersectMinute(a: MinuteInterval, b: MinuteInterval): MinuteInterval | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return end > start ? { start, end } : null;
}

/**
 * Resolve the effective working window (shop-local minutes) for one staff on
 * one day, combining shop hours, staff hours, special-hour overrides and
 * full-day closures. Returns null when the staff is unavailable that day.
 */
export function resolveWorkingWindow(input: {
  businessHour?: DayWindow;
  staffHour?: DaySchedule;
  shopSpecialHour?: SpecialHourOverride;
  staffSpecialHour?: SpecialHourOverride;
  shopClosed: boolean;
  staffClosed: boolean;
}): MinuteInterval | null {
  if (input.shopClosed || input.staffClosed) return null;

  // Shop-level window (special hours override the weekly schedule).
  let shopWindow: MinuteInterval | null;
  if (input.shopSpecialHour) {
    shopWindow = input.shopSpecialHour.isClosed
      ? null
      : {
          start: input.shopSpecialHour.openMinute ?? 0,
          end: input.shopSpecialHour.closeMinute ?? 0,
        };
  } else if (input.businessHour && input.businessHour.isOpen) {
    shopWindow = { start: input.businessHour.openMinute, end: input.businessHour.closeMinute };
  } else {
    shopWindow = null;
  }
  if (!shopWindow || shopWindow.end <= shopWindow.start) return null;

  // Staff-level window. If the admin hasn't set staff hours, the barber simply
  // works the shop's open hours.
  let staffWindow: MinuteInterval | null;
  if (input.staffSpecialHour) {
    staffWindow = input.staffSpecialHour.isClosed
      ? null
      : {
          start: input.staffSpecialHour.openMinute ?? shopWindow.start,
          end: input.staffSpecialHour.closeMinute ?? shopWindow.end,
        };
  } else if (input.staffHour) {
    staffWindow = input.staffHour.isWorking
      ? { start: input.staffHour.startMinute, end: input.staffHour.endMinute }
      : null;
  } else {
    staffWindow = shopWindow;
  }
  if (!staffWindow) return null;

  return intersectMinute(shopWindow, staffWindow);
}

/** Expand an existing booking to its buffer-padded occupied UTC interval. */
export function occupiedInterval(b: ExistingBooking): { start: number; end: number } {
  return {
    start: b.startAt.getTime() - b.bufferBeforeMin * MS_PER_MIN,
    end: b.endAt.getTime() + b.bufferAfterMin * MS_PER_MIN,
  };
}

/**
 * Generate every bookable slot for a single staff member on a single day.
 */
export function computeStaffDaySlots(params: {
  dateKey: string;
  tz: string;
  slotIntervalMin: number;
  serviceDurationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  workingWindow: MinuteInterval;
  breaks: MinuteInterval[];
  bookings: ExistingBooking[];
  minStartUtc: Date;
}): Slot[] {
  const {
    dateKey,
    tz,
    slotIntervalMin,
    serviceDurationMin,
    bufferBeforeMin,
    bufferAfterMin,
    workingWindow,
    breaks,
    bookings,
    minStartUtc,
  } = params;

  if (slotIntervalMin <= 0 || serviceDurationMin <= 0) return [];

  const occupied = bookings.map(occupiedInterval);
  const minStartMs = minStartUtc.getTime();
  const slots: Slot[] = [];

  for (
    let startMinute = workingWindow.start;
    startMinute + serviceDurationMin <= workingWindow.end;
    startMinute += slotIntervalMin
  ) {
    const serviceWindow: MinuteInterval = {
      start: startMinute,
      end: startMinute + serviceDurationMin,
    };

    // Reject when the service itself overlaps any break.
    if (breaks.some((br) => minuteRangesOverlap(serviceWindow, br))) continue;

    const startAt = localMinutesToUtc(dateKey, startMinute, tz);
    const endAt = localMinutesToUtc(dateKey, startMinute + serviceDurationMin, tz);

    // Minimum-notice / no-past-bookings guard.
    if (startAt.getTime() < minStartMs) continue;

    // Conflict check against existing (buffer-padded) bookings.
    const candStart = startAt.getTime() - bufferBeforeMin * MS_PER_MIN;
    const candEnd = endAt.getTime() + bufferAfterMin * MS_PER_MIN;
    const conflict = occupied.some((o) =>
      rangesOverlap(new Date(candStart), new Date(candEnd), new Date(o.start), new Date(o.end)),
    );
    if (conflict) continue;

    slots.push({ startMinute, startAt, endAt });
  }

  return slots;
}

export interface AggregatedSlot {
  startMinute: number;
  startAt: Date;
  endAt: Date;
  availableStaffIds: string[];
}

/**
 * Merge per-staff slot lists into a single availability list. A time is
 * available when ≥1 staff is free; `availableStaffIds` lists who, so the
 * booking layer can assign a barber for "Any available barber".
 */
export function aggregateStaffSlots(perStaff: Record<string, Slot[]>): AggregatedSlot[] {
  const byMinute = new Map<number, AggregatedSlot>();

  for (const [staffId, slots] of Object.entries(perStaff)) {
    for (const slot of slots) {
      const existing = byMinute.get(slot.startMinute);
      if (existing) {
        existing.availableStaffIds.push(staffId);
      } else {
        byMinute.set(slot.startMinute, {
          startMinute: slot.startMinute,
          startAt: slot.startAt,
          endAt: slot.endAt,
          availableStaffIds: [staffId],
        });
      }
    }
  }

  return [...byMinute.values()].sort((a, b) => a.startMinute - b.startMinute);
}
