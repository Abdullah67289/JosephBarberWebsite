// Ad-hoc end-to-end test of the booking backend against the running dev server.
// Usage: node scripts/e2e-test.mjs
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const db = new PrismaClient();
const log = (...a) => console.log(...a);
let failures = 0;
const check = (cond, msg) => {
  log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
};

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getJson(url) {
  const r = await fetch(url);
  return r.json();
}
async function postJson(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.json() };
}

async function main() {
  const settings = await db.siteSettings.findUnique({ where: { id: "singleton" } });
  const firstTestDay = Math.max(1, Math.ceil((settings?.cancellationCutoffHours ?? 12) / 24) + 2);

  // Pick a service that has at least one assigned barber.
  const service = await db.service.findFirst({
    where: { isActive: true, isBookable: true, staff: { some: {} } },
    include: { staff: true },
    orderBy: { displayOrder: "asc" },
  });
  if (!service) throw new Error("No service with staff found — run the seed.");
  const staffId = service.staff[0].staffId;
  log(`Service: ${service.name} (${service.durationMin}m)  staff=${staffId}`);

  // Find the next date with availability for this specific barber.
  let found = null;
  for (let i = firstTestDay; i <= firstTestDay + 30 && !found; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const res = await getJson(`${BASE}/api/availability?serviceId=${service.id}&staffId=${staffId}&date=${key}`);
    if (res.ok && res.data.slots.length > 0) found = { key, slots: res.data.slots };
  }
  check(!!found, `Found availability within 30 days (${found?.key}, ${found?.slots.length} slots)`);
  if (!found) return;

  const slot = found.slots[Math.floor(found.slots.length / 2)];
  log(`Booking slot ${slot.label} (minute ${slot.startMinute}) on ${found.key}`);

  // Create a booking with that specific barber.
  const create = await postJson(`${BASE}/api/bookings`, {
    serviceId: service.id,
    staffId,
    date: found.key,
    startMinute: slot.startMinute,
    addonIds: [],
    customer: { name: "E2E Tester", email: `e2e_${Date.now()}@test.dev`, phone: "905-555-0100" },
  });
  check(create.status === 200 && create.json.ok, `Booking created (ref ${create.json.data?.reference})`);
  const { reference, manageToken } = create.json.data ?? {};

  // The same slot for the same barber must now be gone (no double-booking).
  const after = await getJson(`${BASE}/api/availability?serviceId=${service.id}&staffId=${staffId}&date=${found.key}`);
  const stillThere = after.data.slots.some((s) => s.startMinute === slot.startMinute);
  check(!stillThere, "Slot removed from that barber's availability after booking");

  // Attempting to book the exact same slot/barber again must be rejected.
  const dbl = await postJson(`${BASE}/api/bookings`, {
    serviceId: service.id,
    staffId,
    date: found.key,
    startMinute: slot.startMinute,
    addonIds: [],
    customer: { name: "Double Booker", email: `dbl_${Date.now()}@test.dev`, phone: "905-555-0101" },
  });
  check(!dbl.json.ok && (dbl.status === 409 || dbl.status === 422), `Double-booking rejected (status ${dbl.status}, code ${dbl.json.code ?? "-"})`);

  // Reschedule to another slot on the same day if available, else next day.
  let target = after.data.slots[0];
  let targetKey = found.key;
  if (!target) {
    const d = new Date(found.key + "T12:00:00");
    d.setDate(d.getDate() + 1);
    targetKey = dateKey(d);
    const next = await getJson(`${BASE}/api/availability?serviceId=${service.id}&staffId=${staffId}&date=${targetKey}`);
    target = next.data.slots[0];
  }
  if (target) {
    const resch = await postJson(`${BASE}/api/bookings/${manageToken}/reschedule`, {
      date: targetKey,
      startMinute: target.startMinute,
      staffId,
    });
    check(resch.json.ok, `Reschedule succeeded to ${target.label}`);
  }

  // Cancel.
  const cancel = await postJson(`${BASE}/api/bookings/${manageToken}/cancel`, {});
  check(cancel.json.ok, "Cancel succeeded");

  // Verify DB state + audit trail.
  const dbBooking = await db.booking.findUnique({ where: { reference }, include: { events: true } });
  check(dbBooking?.status === "cancelled", "DB booking marked cancelled");
  check(dbBooking?.events.length >= 2, `Audit trail recorded (${dbBooking?.events.length} events)`);

  // Notification logs were written (logged mode is fine).
  const notifs = await db.notificationLog.count({ where: { relatedId: dbBooking?.id } });
  check(notifs > 0, `Notification logs written (${notifs})`);

  log(`\n${failures === 0 ? "ALL PASSED ✓" : failures + " CHECK(S) FAILED ✗"}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
