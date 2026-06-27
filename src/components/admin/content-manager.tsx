"use client";

import * as React from "react";
import type { FaqItem, HomeSection, NavigationLink, PageContent, PolicyItem, SiteSettings, SiteStat, TimelineItem } from "@prisma/client";
import { Plus, Save, Trash2 } from "lucide-react";
import { saveSettings } from "@/server/settings-actions";
import {
  deleteFaqItem,
  deleteNavigationLink,
  deleteSiteStat,
  deleteTimelineItem,
  saveFaqItem,
  saveHomeSection,
  saveNavigationLink,
  savePageContent,
  savePolicyItem,
  saveSiteStat,
  saveTimelineItem,
} from "@/server/website-content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { MediaInput } from "./media-input";
import { NumberInput, ToggleRow } from "./inputs";
import { useAction } from "./use-action";

const PAGE_LABELS: Record<string, string> = {
  home: "Homepage",
  services: "Services",
  booking: "Booking",
  gallery: "Gallery",
  shop: "Shop",
  story: "Story",
  contact: "Contact",
  faq: "FAQ",
};

export function ContentManager({
  settings,
  navLinks,
  pages,
  sections,
  stats,
  faqs,
  policies,
  timeline,
}: {
  settings: SiteSettings;
  navLinks: NavigationLink[];
  pages: PageContent[];
  sections: HomeSection[];
  stats: SiteStat[];
  faqs: FaqItem[];
  policies: PolicyItem[];
  timeline: TimelineItem[];
}) {
  return (
    <div>
      <AdminPageHeader
        title="Website Content"
        description="Update the public website without touching code."
      />
      <Tabs defaultValue="brand">
        <TabsList className="flex-wrap">
          <TabsTrigger value="brand">Header & Brand</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="home">Homepage</TabsTrigger>
          <TabsTrigger value="faq">FAQ & Policies</TabsTrigger>
          <TabsTrigger value="story">Story Timeline</TabsTrigger>
        </TabsList>
        <TabsContent value="brand">
          <BrandPanel settings={settings} navLinks={navLinks} />
        </TabsContent>
        <TabsContent value="pages">
          <PagesPanel pages={pages} />
        </TabsContent>
        <TabsContent value="home">
          <HomePanel sections={sections} stats={stats} />
        </TabsContent>
        <TabsContent value="faq">
          <FaqPolicyPanel faqs={faqs} policies={policies} />
        </TabsContent>
        <TabsContent value="story">
          <TimelinePanel items={timeline} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BrandPanel({ settings, navLinks }: { settings: SiteSettings; navLinks: NavigationLink[] }) {
  const { busy, run } = useAction();
  const [s, setS] = React.useState(settings);
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setS((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Brand, header and CTAs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Business name" required><Input value={s.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
          <Field label="Tagline"><Input value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
          <Field label="Logo" className="md:col-span-2"><MediaInput value={s.logoUrl ?? ""} onChange={(v) => set("logoUrl", v)} /></Field>
          <Field label="Favicon"><MediaInput value={s.faviconUrl ?? ""} onChange={(v) => set("faviconUrl", v)} /></Field>
          <Field label="Open Graph image"><MediaInput value={s.openGraphImageUrl ?? ""} onChange={(v) => set("openGraphImageUrl", v)} /></Field>
          <Field label="Phone"><Input value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Street address"><Input value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="City"><Input value={s.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Province / region"><Input value={s.region} onChange={(e) => set("region", e.target.value)} /></Field>
          <Field label="Postal code"><Input value={s.postalCode} onChange={(e) => set("postalCode", e.target.value)} /></Field>
          <Field label="Book button text"><Input value={s.navBookText} onChange={(e) => set("navBookText", e.target.value)} /></Field>
          <Field label="Book button link"><Input value={s.navBookHref} onChange={(e) => set("navBookHref", e.target.value)} /></Field>
          <Field label="Primary accent"><Input type="color" value={s.primaryAccentHex} onChange={(e) => set("primaryAccentHex", e.target.value)} className="h-11 w-24 p-1" /></Field>
          <Field label="Secondary accent"><Input type="color" value={s.secondaryAccentHex} onChange={(e) => set("secondaryAccentHex", e.target.value)} className="h-11 w-24 p-1" /></Field>
          <ToggleRow label="Show Shop in navigation" checked={s.showShopInNav} onChange={(v) => set("showShopInNav", v)} />
          <ToggleRow label="Show cart button" checked={s.showCartButton} onChange={(v) => set("showCartButton", v)} />
          <Field label="SEO title"><Input value={s.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
          <Field label="SEO description"><Input value={s.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
          <div className="md:col-span-2">
            <Button loading={busy} onClick={() => run(() => saveSettings(settingsPayload(s)), { success: "Website settings saved." })}>
              <Save className="h-4 w-4" /> Save brand settings
            </Button>
          </div>
        </div>
      </div>
      <NavigationPanel links={navLinks} />
    </div>
  );
}

function NavigationPanel({ links }: { links: NavigationLink[] }) {
  const [items, setItems] = React.useState(links);
  const [draft, setDraft] = React.useState({ area: "header", label: "", href: "", displayOrder: 0 });
  const action = useAction();
  const update = (id: string, patch: Partial<NavigationLink>) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Navigation links</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} />
              <Input value={item.href} onChange={(e) => update(item.id, { href: e.target.value })} />
              <ConfirmDelete title="Delete navigation link?" onConfirm={() => deleteNavigationLink(item.id)} success="Navigation link deleted." />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Select value={item.area} onValueChange={(v) => update(item.id, { area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="header">Header</SelectItem><SelectItem value="footer">Footer</SelectItem></SelectContent>
              </Select>
              <NumberInput value={item.displayOrder} onChange={(v) => update(item.id, { displayOrder: v })} />
              <Button onClick={() => action.run(() => saveNavigationLink(item), { success: "Link saved." })} loading={action.busy}>Save</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-sm font-medium">Add link</p>
        <div className="grid gap-2">
          <Input placeholder="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          <Input placeholder="/services" value={draft.href} onChange={(e) => setDraft((d) => ({ ...d, href: e.target.value }))} />
          <Button
            onClick={async () => {
              const res = await action.run(() => saveNavigationLink(draft), { success: "Link added." });
              if (res.ok) setDraft({ area: "header", label: "", href: "", displayOrder: 0 });
            }}
            loading={action.busy}
          >
            <Plus className="h-4 w-4" /> Add link
          </Button>
        </div>
      </div>
    </div>
  );
}

function PagesPanel({ pages }: { pages: PageContent[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {pages.map((page) => (
        <PageCard key={page.id} page={page} />
      ))}
    </div>
  );
}

function PageCard({ page }: { page: PageContent }) {
  const { busy, run } = useAction();
  const [p, setP] = React.useState(page);
  const set = <K extends keyof PageContent>(key: K, value: PageContent[K]) => setP((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-semibold">{PAGE_LABELS[p.pageKey] ?? p.pageKey}</h2>
      <div className="mt-4 grid gap-3">
        <Field label="Eyebrow"><Input value={p.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} /></Field>
        <Field label="Title" required><Input value={p.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Subtitle"><Textarea value={p.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} rows={2} /></Field>
        <Field label="Body / long copy"><Textarea value={p.body ?? ""} onChange={(e) => set("body", e.target.value)} rows={3} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="CTA text"><Input value={p.ctaText ?? ""} onChange={(e) => set("ctaText", e.target.value)} /></Field>
          <Field label="CTA link"><Input value={p.ctaHref ?? ""} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
        </div>
        <Field label="Hero/page image"><MediaInput value={p.heroImageUrl ?? ""} onChange={(v) => set("heroImageUrl", v)} /></Field>
        <Button onClick={() => run(() => savePageContent(p), { success: "Page content saved." })} loading={busy}>
          <Save className="h-4 w-4" /> Save page
        </Button>
      </div>
    </div>
  );
}

function HomePanel({ sections, stats }: { sections: HomeSection[]; stats: SiteStat[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Homepage sections</h2>
        <div className="space-y-3">
          {sections.map((section) => <HomeSectionCard key={section.id} section={section} />)}
        </div>
      </div>
      <StatsPanel stats={stats} />
    </div>
  );
}

function HomeSectionCard({ section }: { section: HomeSection }) {
  const { busy, run } = useAction();
  const [s, setS] = React.useState(section);
  const set = <K extends keyof HomeSection>(key: K, value: HomeSection[K]) => setS((prev) => ({ ...prev, [key]: value }));
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <Input value={s.label} onChange={(e) => set("label", e.target.value)} />
        <NumberInput value={s.displayOrder} onChange={(v) => set("displayOrder", v)} className="w-24" />
        <ToggleRow label="Visible" checked={s.isVisible} onChange={(v) => set("isVisible", v)} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Input placeholder="Eyebrow" value={s.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} />
        <Input placeholder="Title" value={s.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        <Input placeholder="CTA text" value={s.ctaText ?? ""} onChange={(e) => set("ctaText", e.target.value)} />
        <Input placeholder="CTA link" value={s.ctaHref ?? ""} onChange={(e) => set("ctaHref", e.target.value)} />
        <div className="sm:col-span-2">
          <Textarea placeholder="Subtitle" value={s.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} rows={2} />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={() => run(() => saveHomeSection(s), { success: "Section saved." })} loading={busy}>Save section</Button>
      </div>
    </div>
  );
}

function StatsPanel({ stats }: { stats: SiteStat[] }) {
  const [items, setItems] = React.useState(stats);
  const [draft, setDraft] = React.useState({ label: "", value: 0, suffix: "", icon: "award", displayOrder: 0, isActive: true });
  const action = useAction();
  const update = (id: string, patch: Partial<SiteStat>) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Stats / counters</h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="grid gap-2">
              <Input value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} />
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <NumberInput value={item.value} onChange={(v) => update(item.id, { value: v })} />
                <Input value={item.suffix ?? ""} onChange={(e) => update(item.id, { suffix: e.target.value })} placeholder="suffix" />
                <ConfirmDelete title="Delete stat?" onConfirm={() => deleteSiteStat(item.id)} success="Stat deleted." />
              </div>
              <Button onClick={() => action.run(() => saveSiteStat(item), { success: "Stat saved." })} loading={action.busy}>Save</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-sm font-medium">Add stat</p>
        <div className="grid gap-2">
          <Input placeholder="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          <NumberInput value={draft.value} onChange={(value) => setDraft((d) => ({ ...d, value }))} />
          <Button onClick={() => action.run(() => saveSiteStat(draft), { success: "Stat added." })} loading={action.busy}><Plus className="h-4 w-4" /> Add stat</Button>
        </div>
      </div>
    </div>
  );
}

function FaqPolicyPanel({ faqs, policies }: { faqs: FaqItem[]; policies: PolicyItem[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <FaqPanel faqs={faqs} />
      <PolicyPanel policies={policies} />
    </div>
  );
}

function FaqPanel({ faqs }: { faqs: FaqItem[] }) {
  const [items, setItems] = React.useState(faqs);
  const [draft, setDraft] = React.useState({ question: "", answer: "", category: "Booking", displayOrder: 0, isActive: true });
  const action = useAction();
  const update = (id: string, patch: Partial<FaqItem>) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">FAQ</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <Input value={item.question} onChange={(e) => update(item.id, { question: e.target.value })} />
            <Textarea value={item.answer} onChange={(e) => update(item.id, { answer: e.target.value })} rows={2} className="mt-2" />
            <div className="mt-2 flex justify-end gap-2">
              <ConfirmDelete title="Delete FAQ?" onConfirm={() => deleteFaqItem(item.id)} success="FAQ deleted." />
              <Button onClick={() => action.run(() => saveFaqItem(item), { success: "FAQ saved." })} loading={action.busy}>Save</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-border p-3">
        <Input placeholder="Question" value={draft.question} onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))} />
        <Textarea placeholder="Answer" value={draft.answer} onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))} rows={2} className="mt-2" />
        <Button className="mt-2" onClick={() => action.run(() => saveFaqItem(draft), { success: "FAQ added." })} loading={action.busy}><Plus className="h-4 w-4" /> Add FAQ</Button>
      </div>
    </div>
  );
}

function PolicyPanel({ policies }: { policies: PolicyItem[] }) {
  const action = useAction();
  const [items, setItems] = React.useState(policies);
  const update = (id: string, patch: Partial<PolicyItem>) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Policies</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <Input value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} />
            <Textarea value={item.body} onChange={(e) => update(item.id, { body: e.target.value })} rows={3} className="mt-2" />
            <div className="mt-2 flex justify-end">
              <Button onClick={() => action.run(() => savePolicyItem(item), { success: "Policy saved." })} loading={action.busy}>Save</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelinePanel({ items }: { items: TimelineItem[] }) {
  const [rows, setRows] = React.useState(items);
  const [draft, setDraft] = React.useState({ label: "", title: "", body: "", imageUrl: "", displayOrder: 0, isActive: true });
  const action = useAction();
  const update = (id: string, patch: Partial<TimelineItem>) => setRows((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-semibold">Story timeline</h2>
      <div className="space-y-3">
        {rows.map((item) => (
          <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
              <Input value={item.label} onChange={(e) => update(item.id, { label: e.target.value })} />
              <Input value={item.title} onChange={(e) => update(item.id, { title: e.target.value })} />
              <ConfirmDelete title="Delete timeline item?" onConfirm={() => deleteTimelineItem(item.id)} success="Timeline item deleted." />
            </div>
            <Textarea value={item.body} onChange={(e) => update(item.id, { body: e.target.value })} rows={2} className="mt-2" />
            <div className="mt-2">
              <MediaInput value={item.imageUrl ?? ""} onChange={(v) => update(item.id, { imageUrl: v })} />
            </div>
            <div className="mt-2 flex justify-end">
              <Button onClick={() => action.run(() => saveTimelineItem(item), { success: "Timeline item saved." })} loading={action.busy}>Save</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-border p-3">
        <p className="mb-2 text-sm font-medium">Add timeline item</p>
        <div className="grid gap-2">
          <Input placeholder="Label, e.g. 1966" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
          <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <Textarea placeholder="Story" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={2} />
          <MediaInput value={draft.imageUrl} onChange={(imageUrl) => setDraft((d) => ({ ...d, imageUrl }))} />
          <Button onClick={() => action.run(() => saveTimelineItem(draft), { success: "Timeline item added." })} loading={action.busy}><Plus className="h-4 w-4" /> Add item</Button>
        </div>
      </div>
    </div>
  );
}

function settingsPayload(s: SiteSettings) {
  return {
    businessName: s.businessName,
    tagline: s.tagline,
    description: s.description,
    logoUrl: s.logoUrl,
    faviconUrl: s.faviconUrl,
    heroImageUrl: s.heroImageUrl,
    heroHeadline: s.heroHeadline,
    heroSubheadline: s.heroSubheadline,
    heroPrimaryCtaText: s.heroPrimaryCtaText,
    heroPrimaryCtaHref: s.heroPrimaryCtaHref,
    heroSecondaryCtaText: s.heroSecondaryCtaText,
    heroSecondaryCtaHref: s.heroSecondaryCtaHref,
    aboutTitle: s.aboutTitle,
    aboutBody: s.aboutBody,
    phone: s.phone,
    email: s.email,
    address: s.address,
    city: s.city,
    region: s.region,
    postalCode: s.postalCode,
    country: s.country,
    mapEmbedUrl: s.mapEmbedUrl,
    latitude: s.latitude,
    longitude: s.longitude,
    timezone: s.timezone,
    currency: s.currency,
    instagramUrl: s.instagramUrl,
    facebookUrl: s.facebookUrl,
    tiktokUrl: s.tiktokUrl,
    youtubeUrl: s.youtubeUrl,
    googleReviewUrl: s.googleReviewUrl,
    navBookText: s.navBookText,
    navBookHref: s.navBookHref,
    showShopInNav: s.showShopInNav,
    showCartButton: s.showCartButton,
    primaryAccentHex: s.primaryAccentHex,
    secondaryAccentHex: s.secondaryAccentHex,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    openGraphImageUrl: s.openGraphImageUrl,
    slotIntervalMin: s.slotIntervalMin,
    minNoticeMin: s.minNoticeMin,
    maxAdvanceDays: s.maxAdvanceDays,
    maxPerSlot: s.maxPerSlot,
    cancellationCutoffHours: s.cancellationCutoffHours,
    depositRequired: s.depositRequired,
    allowAnyBarber: s.allowAnyBarber,
    requireCustomerName: s.requireCustomerName,
    requireCustomerEmail: s.requireCustomerEmail,
    requireCustomerPhone: s.requireCustomerPhone,
    requireCustomerNotes: s.requireCustomerNotes,
    taxRatePct: s.taxRatePct,
    bookingPolicy: s.bookingPolicy,
    cancellationPolicy: s.cancellationPolicy,
    latePolicy: s.latePolicy,
    noShowPolicy: s.noShowPolicy,
    depositPolicy: s.depositPolicy,
    privacyPolicy: s.privacyPolicy,
    bookingInstructions: s.bookingInstructions,
    bookingHelpText: s.bookingHelpText,
    bookingNotesHelpText: s.bookingNotesHelpText,
    bookingConfirmationTitle: s.bookingConfirmationTitle,
    bookingConfirmationText: s.bookingConfirmationText,
    enableEmail: s.enableEmail,
    enableSms: s.enableSms,
  };
}
