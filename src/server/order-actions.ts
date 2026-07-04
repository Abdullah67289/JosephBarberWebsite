"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orderUpdateSchema } from "@/lib/validation";
import { guard, actionOk, toActionError, type ActionResult } from "./_helpers";

export async function updateOrder(id: string, raw: unknown): Promise<ActionResult> {
  await guard("manage_orders");
  try {
    const data = orderUpdateSchema.parse(raw);
    await db.order.update({ where: { id }, data });
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
