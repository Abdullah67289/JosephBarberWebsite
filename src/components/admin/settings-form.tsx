"use client";

import * as React from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { SiteSettings } from "@prisma/client";
import { saveSettings } from "@/server/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NumberInput, ToggleRow } from "./inputs";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [s, setS] = React.useState(settings);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((p) => ({ ...p, [k]: v }));

  async function save() {
    setBusy(true);
    setErrors({});
    const res = await saveSettings({
      businessName: s.businessName,
      tagline: s.tagline,
      description: s.description,
      logoUrl: s.logoUrl,
      heroImageUrl: s.heroImageUrl,
      heroHeadline: s.heroHeadline,
      heroSubheadline: s.heroSubheadline,
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
    });
    setBusy(false);
    if (res.ok) toast.success("Settings saved.");
    else {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      toast.error(res.error ?? "Could not save settings.");
    }
  }

  const text = (k: keyof SiteSettings, label: string, opts: { area?: boolean; placeholder?: string; required?: boolean } = {}) => (
    <Field label={label} error={errors[k as string]} required={opts.required}>
      {opts.area ? (
        <Textarea value={(s[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} placeholder={opts.placeholder} rows={4} />
      ) : (
        <Input value={(s[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as never)} placeholder={opts.placeholder} />
      )}
    </Field>
  );

  return (
    <div>
      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">Business</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="booking">Booking Rules</TabsTrigger>
          <TabsTrigger value="integrations">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
            {text("businessName", "Business name", { required: true })}
            {text("tagline", "Tagline")}
            <div className="md:col-span-2">{text("description", "Short description", { area: true })}</div>
            {text("phone", "Phone", { required: true })}
            {text("email", "Email", { required: true })}
            {text("address", "Street address", { required: true })}
            {text("city", "City", { required: true })}
            {text("region", "Province / Region", { required: true })}
            {text("postalCode", "Postal code", { required: true })}
            {text("country", "Country", { required: true })}
            <Field label="Timezone (IANA)" error={errors.timezone}>
              <Input value={s.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="America/Toronto" />
            </Field>
            <Field label="Currency (3-letter)" error={errors.currency}>
              <Input value={s.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} maxLength={3} />
            </Field>
            <div className="md:col-span-2">{text("mapEmbedUrl", "Google Maps embed URL", { placeholder: "https://maps.google.com/maps?q=...&output=embed" })}</div>
            {text("logoUrl", "Logo image URL")}
            {text("heroImageUrl", "Hero image URL")}
            {text("instagramUrl", "Instagram URL")}
            {text("facebookUrl", "Facebook URL")}
            {text("tiktokUrl", "TikTok URL")}
            {text("youtubeUrl", "YouTube URL")}
            {text("googleReviewUrl", "Google reviews URL")}
          </div>
        </TabsContent>

        <TabsContent value="content">
          <div className="grid gap-4 rounded-xl border border-border bg-card p-6">
            {text("heroHeadline", "Hero headline", { placeholder: "A Cut Above" })}
            {text("heroSubheadline", "Hero subheadline", { area: true })}
            {text("aboutTitle", "About section title")}
            {text("aboutBody", "About / story text", { area: true })}
            {text("bookingPolicy", "Booking policy", { area: true })}
            {text("cancellationPolicy", "Cancellation policy", { area: true })}
          </div>
        </TabsContent>

        <TabsContent value="booking">
          <div className="grid gap-4 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
            <Field label="Time slot interval (minutes)" hint="e.g. 15 or 30" error={errors.slotIntervalMin}>
              <NumberInput value={s.slotIntervalMin} onChange={(v) => set("slotIntervalMin", v)} min={5} max={120} />
            </Field>
            <Field label="Minimum notice (minutes)" hint="How far ahead bookings must be made" error={errors.minNoticeMin}>
              <NumberInput value={s.minNoticeMin} onChange={(v) => set("minNoticeMin", v)} min={0} />
            </Field>
            <Field label="Booking window (days ahead)" error={errors.maxAdvanceDays}>
              <NumberInput value={s.maxAdvanceDays} onChange={(v) => set("maxAdvanceDays", v)} min={1} max={365} />
            </Field>
            <Field label="Cancellation cutoff (hours)" hint="Customers can't self-edit within this window" error={errors.cancellationCutoffHours}>
              <NumberInput value={s.cancellationCutoffHours} onChange={(v) => set("cancellationCutoffHours", v)} min={0} max={168} />
            </Field>
            <Field label="Tax rate (%)" error={errors.taxRatePct}>
              <NumberInput value={s.taxRatePct} onChange={(v) => set("taxRatePct", v)} min={0} max={100} />
            </Field>
            <Field label="Max appointments per slot" hint="When multiple barbers are free" error={errors.maxPerSlot}>
              <NumberInput value={s.maxPerSlot} onChange={(v) => set("maxPerSlot", v)} min={1} max={50} />
            </Field>
            <div className="md:col-span-2">
              <ToggleRow label="Require deposits" description="Collect a deposit at booking for services that have one set" checked={s.depositRequired} onChange={(v) => set("depositRequired", v)} />
            </div>
            <div className="md:col-span-2">
              <ToggleRow label="Allow any available barber" description="Shows the fastest-available option in the booking flow" checked={s.allowAnyBarber} onChange={(v) => set("allowAnyBarber", v)} />
            </div>
            <div className="md:col-span-2 grid gap-2 sm:grid-cols-2">
              <ToggleRow label="Require customer name" checked={s.requireCustomerName} onChange={(v) => set("requireCustomerName", v)} />
              <ToggleRow label="Require customer phone" checked={s.requireCustomerPhone} onChange={(v) => set("requireCustomerPhone", v)} />
              <ToggleRow label="Require customer email" checked={s.requireCustomerEmail} onChange={(v) => set("requireCustomerEmail", v)} />
              <ToggleRow label="Require customer notes" checked={s.requireCustomerNotes} onChange={(v) => set("requireCustomerNotes", v)} />
            </div>
            <div className="md:col-span-2">{text("bookingHelpText", "Booking help text", { area: true })}</div>
            <div className="md:col-span-2">{text("bookingNotesHelpText", "Notes field help text", { area: true })}</div>
            {text("bookingConfirmationTitle", "Confirmation title")}
            {text("bookingConfirmationText", "Confirmation message", { area: true })}
            <div className="md:col-span-2">{text("bookingInstructions", "Booking instructions", { area: true })}</div>
            <div className="md:col-span-2">{text("cancellationPolicy", "Cancellation policy", { area: true })}</div>
            <div className="md:col-span-2">{text("latePolicy", "Late policy", { area: true })}</div>
            <div className="md:col-span-2">{text("noShowPolicy", "No-show policy", { area: true })}</div>
            <div className="md:col-span-2">{text("depositPolicy", "Deposit/payment policy", { area: true })}</div>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-3 rounded-xl border border-border bg-card p-6">
            <ToggleRow label="Email notifications" description="Send booking & order emails (requires RESEND_API_KEY)" checked={s.enableEmail} onChange={(v) => set("enableEmail", v)} />
            <ToggleRow label="SMS notifications" description="Send booking & order texts (requires Twilio keys)" checked={s.enableSms} onChange={(v) => set("enableSms", v)} />
            <p className="mt-2 text-xs text-muted-foreground">
              Provider API keys are configured via environment variables (see <code>.env.example</code>). Without keys,
              messages are safely logged instead of sent.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={save} loading={busy} size="lg">
          <Save className="h-4 w-4" /> Save settings
        </Button>
      </div>
    </div>
  );
}
