"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { orderUpdateSchema } from "@/lib/validation";
import { guard, actionOk, toActionError, logAdminAction, type ActionResult } from "./_helpers";

export async function updateOrder(id: string, raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_orders");
  try {
    const data = orderUpdateSchema.parse(raw);
    await db.order.update({ where: { id }, data });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "update", targetType: "order", targetId: id, message: "Updated order" });
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
