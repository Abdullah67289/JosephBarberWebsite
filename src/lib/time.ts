import { addDays } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Timezone-safe time helpers.
 *
 * The shop runs on wall-clock rules (e.g. "open 9:00–17:00 on Tuesdays").
 * We store those as minutes-from-midnight + day-of-week, and convert to/from
 * absolute UTC instants against the shop's IANA timezone here. All booking
 * instants in the DB are UTC; all wall-clock math goes through this module.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** A "YYYY-MM-DD" key (regex-validated) used for shop-local calendar days. */
export type DateKey = string;

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/** Today's shop-local calendar day, e.g. "2026-06-15". */
export function todayKey(tz: string): DateKey {
  return formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
}

/** The shop-local calendar day for an absolute instant. */
export function dayKey(date: Date, tz: string): DateKey {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Convert a shop-local wall-clock time (date + minutes from midnight) to the
 * absolute UTC instant. Handles DST transitions correctly via date-fns-tz.
 */
export function localMinutesToUtc(dateKey: DateKey, minutes: number, tz: string): Date {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return fromZonedTime(`${dateKey}T${pad(hh)}:${pad(mm)}:00`, tz);
}

/** Minutes-from-midnight (shop-local) for an absolute instant. */
export function utcToLocalMinutes(date: Date, tz: string): number {
  const h = Number(formatInTimeZone(date, tz, "H"));
  const m = Number(formatInTimeZone(date, tz, "m"));
  return h * 60 + m;
}

/** Day of week (0 = Sunday … 6 = Saturday) for a shop-local calendar day. */
export function dayOfWeek(dateKey: DateKey, tz: string): number {
  const noon = fromZonedTime(`${dateKey}T12:00:00`, tz);
  return Number(formatInTimeZone(noon, tz, "i")) % 7; // ISO 1..7 (Mon..Sun) -> 0..6 (Sun..Sat)
}

/** Add N calendar days to a date key (DST-safe via local noon). */
export function addDaysKey(dateKey: DateKey, n: number, tz: string): DateKey {
  const noon = fromZonedTime(`${dateKey}T12:00:00`, tz);
  return formatInTimeZone(addDays(noon, n), tz, "yyyy-MM-dd");
}

/** True when start <= dateKey <= end (inclusive), using lexical comparison. */
export function isDateKeyInRange(dateKey: DateKey, start: DateKey, end: DateKey): boolean {
  return dateKey >= start && dateKey <= end;
}

/** "9:05 AM" style label from minutes-from-midnight. */
export function minutesToLabel(minutes: number): string {
  const hh24 = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const period = hh24 >= 12 ? "PM" : "AM";
  const hh12 = hh24 % 12 === 0 ? 12 : hh24 % 12;
  return `${hh12}:${pad(mm)} ${period}`;
}

/** Format an absolute instant in the shop timezone. */
export function formatInTz(date: Date, tz: string, fmt: string): string {
  return formatInTimeZone(date, tz, fmt);
}

/** Human label like "Mon, Jun 15 · 9:30 AM". */
export function formatBookingWhen(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "EEE, MMM d · h:mm a");
}

/** ICS UTC timestamp, e.g. 20260615T133000Z. */
export function toIcsUtc(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyyMMdd'T'HHmmss'Z'");
}

/** Two ranges overlap iff aStart < bEnd && aEnd > bStart. */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}
