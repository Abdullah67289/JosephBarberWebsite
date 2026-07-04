import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ContentManager } from "@/components/admin/content-manager";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await requirePermission("manage_content");
  const [settings, navLinks, pages, sections, stats, faqs, policies, timeline] = await Promise.all([
    getSettings(),
    db.navigationLink.findMany({ orderBy: [{ area: "asc" }, { displayOrder: "asc" }], take: 60 }),
    db.pageContent.findMany({ orderBy: { pageKey: "asc" } }),
    db.homeSection.findMany({ orderBy: { displayOrder: "asc" } }),
    db.siteStat.findMany({ orderBy: { displayOrder: "asc" }, take: 24 }),
    db.faqItem.findMany({ orderBy: [{ displayOrder: "asc" }, { question: "asc" }], take: 80 }),
    db.policyItem.findMany({ orderBy: { displayOrder: "asc" }, take: 40 }),
    db.timelineItem.findMany({ orderBy: { displayOrder: "asc" }, take: 40 }),
  ]);

  return (
    <ContentManager
      settings={settings}
      navLinks={navLinks}
      pages={pages}
      sections={sections}
      stats={stats}
      faqs={faqs}
      policies={policies}
      timeline={timeline}
    />
  );
}
