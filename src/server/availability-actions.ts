"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  businessHoursSchema,
  staffHoursSchema,
  breakSchema,
  closureSchema,
  specialHourSchema,
} from "@/lib/validation";
import { guard, actionOk, toActionError, type ActionResult } from "./_helpers";

function revalidateAvailability() {
  for (const p of ["/", "/contact", "/book", "/admin/availability", "/admin/staff"]) revalidatePath(p);
}

export async function saveBusinessHours(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const hours = businessHoursSchema.parse(raw);
    for (const h of hours) {
      await db.businessHour.upsert({
        where: { dayOfWeek: h.dayOfWeek },
        update: { isOpen: h.isOpen, openMinute: h.openMinute, closeMinute: h.closeMinute },
        create: h,
      });
    }
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveStaffHours(staffId: string, raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const hours = staffHoursSchema.parse(raw);
    for (const h of hours) {
      await db.staffHour.upsert({
        where: { staffId_dayOfWeek: { staffId, dayOfWeek: h.dayOfWeek } },
        update: { isWorking: h.isWorking, startMinute: h.startMinute, endMinute: h.endMinute },
        create: { staffId, dayOfWeek: h.dayOfWeek, isWorking: h.isWorking, startMinute: h.startMinute, endMinute: h.endMinute },
      });
    }
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveBreak(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = breakSchema.parse(rest);
    const payload = { ...data, staffId: data.staffId || null };
    if (id) await db.break.update({ where: { id }, data: payload });
    else await db.break.create({ data: payload });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteBreak(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.break.delete({ where: { id } });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveClosure(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = closureSchema.parse(rest);
    const payload = { ...data, staffId: data.staffId || null, note: data.note || null };
    if (id) await db.closure.update({ where: { id }, data: payload });
    else await db.closure.create({ data: payload });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteClosure(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.closure.delete({ where: { id } });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveSpecialHour(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = specialHourSchema.parse(rest);
    const payload = {
      date: data.date,
      staffId: data.staffId || null,
      isClosed: data.isClosed,
      openMinute: data.isClosed ? null : data.openMinute ?? null,
      closeMinute: data.isClosed ? null : data.closeMinute ?? null,
    };
    if (id) await db.specialHour.update({ where: { id }, data: payload });
    else await db.specialHour.create({ data: payload });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteSpecialHour(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.specialHour.delete({ where: { id } });
    revalidateAvailability();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
