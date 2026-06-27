"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { galleryImageSchema, testimonialSchema } from "@/lib/validation";
import { guard, actionOk, actionError, toActionError, type ActionResult } from "./_helpers";

// ----------------------------------------------------------------- gallery

export async function saveGalleryImage(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = galleryImageSchema.parse(rest);
    if (id) await db.galleryImage.update({ where: { id }, data });
    else await db.galleryImage.create({ data });
    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteGalleryImage(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.galleryImage.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/admin/gallery");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

// ----------------------------------------------------------------- testimonials

export async function saveTestimonial(raw: unknown): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = testimonialSchema.parse(rest);
    if (id) await db.testimonial.update({ where: { id }, data });
    else await db.testimonial.create({ data });
    revalidatePath("/");
    revalidatePath("/admin/reviews");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.testimonial.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/admin/reviews");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

// ----------------------------------------------------------------- messages

export async function updateMessageStatus(id: string, status: string): Promise<ActionResult> {
  await guard("ADMIN");
  if (!["new", "read", "archived"].includes(status)) return actionError("Invalid status.");
  try {
    await db.contactMessage.update({ where: { id }, data: { status } });
    revalidatePath("/admin/messages");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await guard("ADMIN");
  try {
    await db.contactMessage.delete({ where: { id } });
    revalidatePath("/admin/messages");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
