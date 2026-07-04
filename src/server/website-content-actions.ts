"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  faqItemSchema,
  homeSectionSchema,
  navigationLinkSchema,
  pageContentSchema,
  policyItemSchema,
  siteStatSchema,
  timelineItemSchema,
} from "@/lib/validation";
import { actionOk, guard, logAdminAction, toActionError, type ActionResult } from "./_helpers";

function revalidatePublicContent() {
  for (const path of ["/", "/services", "/book", "/gallery", "/shop", "/story", "/contact", "/faq", "/admin/content"]) {
    revalidatePath(path);
  }
}

export async function saveNavigationLink(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = navigationLinkSchema.parse(rest);
    const row = id
      ? await db.navigationLink.update({ where: { id }, data })
      : await db.navigationLink.create({ data });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: id ? "update" : "create", targetType: "NavigationLink", targetId: row.id, message: data.label });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteNavigationLink(id: string): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    await db.navigationLink.delete({ where: { id } });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "delete", targetType: "NavigationLink", targetId: id });
    revalidatePublicContent();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function savePageContent(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = pageContentSchema.parse(rest);
    const row = await db.pageContent.upsert({
      where: { pageKey: data.pageKey },
      update: data,
      create: data,
    });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: id ? "update" : "upsert", targetType: "PageContent", targetId: row.id, message: data.pageKey });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveHomeSection(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const data = homeSectionSchema.parse(raw);
    const row = await db.homeSection.upsert({
      where: { sectionKey: data.sectionKey },
      update: data,
      create: data,
    });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "upsert", targetType: "HomeSection", targetId: row.id, message: data.label });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveSiteStat(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = siteStatSchema.parse(rest);
    const row = id ? await db.siteStat.update({ where: { id }, data }) : await db.siteStat.create({ data });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: id ? "update" : "create", targetType: "SiteStat", targetId: row.id, message: data.label });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteSiteStat(id: string): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    await db.siteStat.delete({ where: { id } });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "delete", targetType: "SiteStat", targetId: id });
    revalidatePublicContent();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveFaqItem(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = faqItemSchema.parse(rest);
    const row = id ? await db.faqItem.update({ where: { id }, data }) : await db.faqItem.create({ data });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: id ? "update" : "create", targetType: "FaqItem", targetId: row.id, message: data.question });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteFaqItem(id: string): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    await db.faqItem.delete({ where: { id } });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "delete", targetType: "FaqItem", targetId: id });
    revalidatePublicContent();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}

export async function savePolicyItem(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const data = policyItemSchema.parse(raw);
    const row = await db.policyItem.upsert({
      where: { key: data.key },
      update: data,
      create: data,
    });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "upsert", targetType: "PolicyItem", targetId: row.id, message: data.title });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function saveTimelineItem(raw: unknown): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    const { id, ...rest } = (raw ?? {}) as { id?: string };
    const data = timelineItemSchema.parse(rest);
    const row = id ? await db.timelineItem.update({ where: { id }, data }) : await db.timelineItem.create({ data });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: id ? "update" : "create", targetType: "TimelineItem", targetId: row.id, message: data.title });
    revalidatePublicContent();
    return actionOk(row);
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteTimelineItem(id: string): Promise<ActionResult> {
  const session = await guard("manage_content");
  try {
    await db.timelineItem.delete({ where: { id } });
    await logAdminAction({ actorEmail: session.email, actorRole: session.role, action: "delete", targetType: "TimelineItem", targetId: id });
    revalidatePublicContent();
    return actionOk();
  } catch (err) {
    return toActionError(err);
  }
}
