"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";
import { guard, actionOk, toActionError, logAdminAction, type ActionResult } from "./_helpers";

export async function saveSettings(raw: unknown): Promise<ActionResult> {
  const session = await guard("ADMIN");
  try {
    const current = await getSettings();
    const data = settingsSchema.parse({ ...current, ...(raw as Record<string, unknown>) });
    await db.siteSettings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    await logAdminAction({
      actorEmail: session.email,
      actorRole: session.role,
      action: "settings.updated",
      targetType: "SiteSettings",
      targetId: "singleton",
      message: "Updated site and booking settings",
    });
    // Settings touch nearly every public page.
    for (const p of ["/", "/services", "/gallery", "/story", "/contact", "/shop", "/book", "/faq", "/admin/settings", "/admin/content"]) {
      revalidatePath(p);
    }
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
