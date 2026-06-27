import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveWorkingWindow,
  computeStaffDaySlots,
  aggregateStaffSlots,
  minuteRangesOverlap,
  intersectMinute,
  type ExistingBooking,
} from "./availability";
import { localMinutesToUtc } from "./time";

const TZ = "America/Toronto";
const DATE = "2026-06-15"; // a Monday
const PAST = new Date("2000-01-01T00:00:00Z"); // never restricts

// ---------------------------------------------------------------- interval math

test("minuteRangesOverlap respects half-open edges", () => {
  assert.equal(minuteRangesOverlap({ start: 0, end: 30 }, { start: 30, end: 60 }), false);
  assert.equal(minuteRangesOverlap({ start: 0, end: 31 }, { start: 30, end: 60 }), true);
});

test("intersectMinute returns the overlap or null", () => {
  assert.deepEqual(intersectMinute({ start: 540, end: 1020 }, { start: 600, end: 960 }), {
    start: 600,
    end: 960,
  });
  assert.equal(intersectMinute({ start: 540, end: 600 }, { start: 600, end: 660 }), null);
});

// ---------------------------------------------------------------- working window

test("resolveWorkingWindow intersects shop & staff hours", () => {
  const w = resolveWorkingWindow({
    businessHour: { isOpen: true, openMinute: 540, closeMinute: 1020 },
    staffHour: { isWorking: true, startMinute: 600, endMinute: 960 },
    shopClosed: false,
    staffClosed: false,
  });
  assert.deepEqual(w, { start: 600, end: 960 });
});

test("resolveWorkingWindow returns null when shop closed for the day", () => {
  assert.equal(
    resolveWorkingWindow({
      businessHour: { isOpen: false, openMinute: 540, closeMinute: 1020 },
      shopClosed: false,
      staffClosed: false,
    }),
    null,
  );
});

test("resolveWorkingWindow returns null on a closure/blackout", () => {
  assert.equal(
    resolveWorkingWindow({
      businessHour: { isOpen: true, openMinute: 540, closeMinute: 1020 },
      shopClosed: true,
      staffClosed: false,
    }),
    null,
  );
});

test("special hours override the weekly schedule", () => {
  const w = resolveWorkingWindow({
    businessHour: { isOpen: true, openMinute: 540, closeMinute: 1020 },
    shopSpecialHour: { isClosed: false, openMinute: 600, closeMinute: 720 },
    shopClosed: false,
    staffClosed: false,
  });
  assert.deepEqual(w, { start: 600, end: 720 });
});

// ---------------------------------------------------------------- slot generation

const baseArgs = {
  dateKey: DATE,
  tz: TZ,
  slotIntervalMin: 30,
  serviceDurationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  workingWindow: { start: 540, end: 1020 }, // 09:00–17:00
  breaks: [],
  bookings: [] as ExistingBooking[],
  minStartUtc: PAST,
};

test("generates back-to-back slots across the open window", () => {
  const slots = computeStaffDaySlots(baseArgs);
  // 540..990 inclusive stepping 30 => 16 slots (last fits 990+30=1020).
  assert.equal(slots.length, 16);
  assert.equal(slots[0]!.startMinute, 540);
  assert.equal(slots[slots.length - 1]!.startMinute, 990);
});

test("a break removes only the slots whose service overlaps it", () => {
  const slots = computeStaffDaySlots({
    ...baseArgs,
    breaks: [{ start: 720, end: 780 }], // 12:00–13:00 lunch
  });
  const minutes = slots.map((s) => s.startMinute);
  assert.ok(!minutes.includes(720)); // 12:00 service 12:00-12:30 overlaps
  assert.ok(!minutes.includes(750)); // 12:30 service overlaps
  assert.ok(minutes.includes(690)); // 11:30 service 11:30-12:00 is adjacent → allowed
  assert.ok(minutes.includes(780)); // 13:00 service starts at break end → allowed
});

test("an existing booking blocks the overlapping slot but not adjacent ones", () => {
  const booking: ExistingBooking = {
    startAt: localMinutesToUtc(DATE, 600, TZ), // 10:00
    endAt: localMinutesToUtc(DATE, 630, TZ), // 10:30
    bufferBeforeMin: 0,
    bufferAfterMin: 0,
  };
  const minutes = computeStaffDaySlots({ ...baseArgs, bookings: [booking] }).map((s) => s.startMinute);
  assert.ok(!minutes.includes(600)); // exact overlap
  assert.ok(minutes.includes(570)); // 09:30 ends exactly at 10:00 → no overlap
  assert.ok(minutes.includes(630)); // 10:30 starts at booking end → no overlap
});

test("buffers extend the blocked window around a booking", () => {
  const booking: ExistingBooking = {
    startAt: localMinutesToUtc(DATE, 600, TZ),
    endAt: localMinutesToUtc(DATE, 630, TZ),
    bufferBeforeMin: 0,
    bufferAfterMin: 15, // 15-min cleanup pushes block to 10:45
  };
  const minutes = computeStaffDaySlots({ ...baseArgs, bookings: [booking] }).map((s) => s.startMinute);
  assert.ok(!minutes.includes(630)); // 10:30 now collides with the buffer (blocked to 10:45)
  assert.ok(minutes.includes(660)); // 11:00 is clear
});

test("minimum-notice removes slots that start too soon", () => {
  const minStart = localMinutesToUtc(DATE, 660, TZ); // nothing before 11:00
  const minutes = computeStaffDaySlots({ ...baseArgs, minStartUtc: minStart }).map((s) => s.startMinute);
  assert.equal(Math.min(...minutes), 660);
  assert.ok(!minutes.includes(630));
});

test("a service longer than the remaining window yields no late slot", () => {
  const slots = computeStaffDaySlots({
    ...baseArgs,
    serviceDurationMin: 90,
    workingWindow: { start: 960, end: 1020 }, // only 60 min open, service needs 90
  });
  assert.equal(slots.length, 0);
});

// ---------------------------------------------------------------- aggregation

test("aggregateStaffSlots lists every free barber per time", () => {
  const a = computeStaffDaySlots(baseArgs);
  const b = computeStaffDaySlots({
    ...baseArgs,
    bookings: [
      {
        startAt: localMinutesToUtc(DATE, 540, TZ),
        endAt: localMinutesToUtc(DATE, 570, TZ),
        bufferBeforeMin: 0,
        bufferAfterMin: 0,
      },
    ],
  });
  const merged = aggregateStaffSlots({ alice: a, bob: b });
  const first = merged.find((s) => s.startMinute === 540)!;
  assert.deepEqual(first.availableStaffIds.sort(), ["alice"]); // bob is busy 09:00
  const later = merged.find((s) => s.startMinute === 600)!;
  assert.deepEqual(later.availableStaffIds.sort(), ["alice", "bob"]);
});
