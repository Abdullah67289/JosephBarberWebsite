"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  serviceSchema,
  serviceCategorySchema,
  serviceAddonSchema,
  staffSchema,
  productSchema,
  productCategorySchema,
} from "@/lib/validation";
import { guard, actionOk, toActionError, uniqueSlug, type ActionResult } from "./_helpers";

function revalidateCatalog() {
  for (const p of ["/", "/services", "/shop", "/book", "/admin/services", "/admin/staff", "/admin/products"]) {
    revalidatePath(p);
  }
}

// ----------------------------------------------------------------- services

export async function saveService(raw: unknown): Promise<ActionResult> {
  await guard("manage_services");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = serviceSchema.parse(rest);
    const { staffIds, slug: providedSlug, ...fields } = data;

    if (id) {
      const slug = providedSlug
        ? providedSlug
        : await uniqueSlug(data.name, async (s) => !!(await db.service.findFirst({ where: { slug: s, NOT: { id } } })));
      await db.service.update({ where: { id }, data: { ...fields, slug } });
      await db.serviceStaff.deleteMany({ where: { serviceId: id } });
      if (staffIds.length) await db.serviceStaff.createMany({ data: staffIds.map((staffId) => ({ serviceId: id, staffId })) });
    } else {
      const slug = await uniqueSlug(data.name, async (s) => !!(await db.service.findFirst({ where: { slug: s } })));
      const created = await db.service.create({ data: { ...fields, slug } });
      if (staffIds.length) await db.serviceStaff.createMany({ data: staffIds.map((staffId) => ({ serviceId: created.id, staffId })) });
    }
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteService(id: string): Promise<ActionResult> {
  await guard("manage_services");
  try {
    await db.service.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveServiceCategory(raw: unknown): Promise<ActionResult> {
  await guard("manage_services");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = serviceCategorySchema.parse(rest);
    const slug = data.slug || (await uniqueSlug(data.name, async (s) => !!(await db.serviceCategory.findFirst({ where: { slug: s, NOT: id ? { id } : undefined } }))));
    if (id) await db.serviceCategory.update({ where: { id }, data: { ...data, slug } });
    else await db.serviceCategory.create({ data: { ...data, slug } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteServiceCategory(id: string): Promise<ActionResult> {
  await guard("manage_services");
  try {
    await db.serviceCategory.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveServiceAddon(raw: unknown): Promise<ActionResult> {
  await guard("manage_services");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = serviceAddonSchema.parse(rest);
    if (id) await db.serviceAddon.update({ where: { id }, data });
    else await db.serviceAddon.create({ data });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteServiceAddon(id: string): Promise<ActionResult> {
  await guard("manage_services");
  try {
    await db.serviceAddon.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

// ----------------------------------------------------------------- staff

export async function saveStaff(raw: unknown): Promise<ActionResult> {
  await guard("manage_staff");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = staffSchema.parse(rest);
    const { serviceIds, slug: providedSlug, email, ...fields } = data;
    const cleanEmail = email && email.length ? email : null;

    if (id) {
      const slug = providedSlug || (await uniqueSlug(data.name, async (s) => !!(await db.staff.findFirst({ where: { slug: s, NOT: { id } } }))));
      await db.staff.update({ where: { id }, data: { ...fields, email: cleanEmail, slug } });
      await db.serviceStaff.deleteMany({ where: { staffId: id } });
      if (serviceIds.length) await db.serviceStaff.createMany({ data: serviceIds.map((serviceId) => ({ serviceId, staffId: id })) });
    } else {
      const slug = await uniqueSlug(data.name, async (s) => !!(await db.staff.findFirst({ where: { slug: s } })));
      const created = await db.staff.create({ data: { ...fields, email: cleanEmail, slug } });
      if (serviceIds.length) await db.serviceStaff.createMany({ data: serviceIds.map((serviceId) => ({ serviceId, staffId: created.id })) });
      // Seed default working hours from the shop's business hours so the barber is bookable.
      const businessHours = await db.businessHour.findMany();
      if (businessHours.length) {
        await db.staffHour.createMany({
          data: businessHours.map((h) => ({
            staffId: created.id,
            dayOfWeek: h.dayOfWeek,
            isWorking: h.isOpen,
            startMinute: h.openMinute,
            endMinute: h.closeMinute,
          })),
        });
      }
    }
    revalidateCatalog();
    revalidatePath("/story");
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  await guard("manage_staff");
  try {
    await db.staff.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

// ----------------------------------------------------------------- products

export async function saveProduct(raw: unknown): Promise<ActionResult> {
  await guard("manage_shop");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = productSchema.parse(rest);
    const { images, variants, slug: providedSlug, sku, ...fields } = data;
    const cleanSku = sku && sku.length ? sku : null;

    if (id) {
      const slug = providedSlug || (await uniqueSlug(data.name, async (s) => !!(await db.product.findFirst({ where: { slug: s, NOT: { id } } }))));
      await db.product.update({ where: { id }, data: { ...fields, sku: cleanSku, slug } });
      await db.productImage.deleteMany({ where: { productId: id } });
      await db.productVariant.deleteMany({ where: { productId: id } });
      if (images.length) await db.productImage.createMany({ data: images.map((im, i) => ({ productId: id, url: im.url, alt: im.alt ?? null, displayOrder: i })) });
      if (variants.length) await db.productVariant.createMany({ data: variants.map((v) => ({ productId: id, name: v.name, value: v.value, priceDeltaCents: v.priceDeltaCents, stock: v.stock, sku: v.sku ?? null })) });
    } else {
      const slug = await uniqueSlug(data.name, async (s) => !!(await db.product.findFirst({ where: { slug: s } })));
      const created = await db.product.create({ data: { ...fields, sku: cleanSku, slug } });
      if (images.length) await db.productImage.createMany({ data: images.map((im, i) => ({ productId: created.id, url: im.url, alt: im.alt ?? null, displayOrder: i })) });
      if (variants.length) await db.productVariant.createMany({ data: variants.map((v) => ({ productId: created.id, name: v.name, value: v.value, priceDeltaCents: v.priceDeltaCents, stock: v.stock, sku: v.sku ?? null })) });
    }
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  await guard("manage_shop");
  try {
    await db.product.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveProductCategory(raw: unknown): Promise<ActionResult> {
  await guard("manage_shop");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = productCategorySchema.parse(rest);
    const slug = data.slug || (await uniqueSlug(data.name, async (s) => !!(await db.productCategory.findFirst({ where: { slug: s, NOT: id ? { id } : undefined } }))));
    if (id) await db.productCategory.update({ where: { id }, data: { ...data, slug } });
    else await db.productCategory.create({ data: { ...data, slug } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteProductCategory(id: string): Promise<ActionResult> {
  await guard("manage_shop");
  try {
    await db.productCategory.delete({ where: { id } });
    revalidateCatalog();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
