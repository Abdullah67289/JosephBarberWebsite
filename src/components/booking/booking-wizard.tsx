"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  User,
  Scissors,
  Loader2,
  PartyPopper,
  CalendarPlus,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { ServiceIcon } from "@/components/site/service-icon";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { shouldOptimizeImage } from "@/lib/image";

// ----------------------------------------------------------------- types

export interface WizardAddon {
  id: string;
  name: string;
  priceCents: number;
  durationMin: number;
}
export interface WizardService {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMin: number;
  priceCents: number;
  depositCents: number;
  icon?: string | null;
  categoryName: string;
  staffIds: string[];
  addons: WizardAddon[];
}
export interface WizardStaff {
  id: string;
  name: string;
  slug: string;
  title: string;
  photoUrl?: string | null;
}
export interface WizardSettings {
  timezone: string;
  currency: string;
  maxAdvanceDays: number;
  depositRequired: boolean;
  cancellationPolicy?: string | null;
  allowAnyBarber: boolean;
  requireCustomerName: boolean;
  requireCustomerEmail: boolean;
  requireCustomerPhone: boolean;
  requireCustomerNotes: boolean;
  bookingHelpText?: string | null;
  bookingNotesHelpText?: string | null;
  bookingConfirmationTitle: string;
  bookingConfirmationText: string;
}

interface Slot {
  startMinute: number;
  label: string;
  startISO: string;
  availableStaffIds: string[];
}

// Two-step flow: everything the customer *chooses* on step 1, everything we
// *need from them* (when + contact) plus the live review on step 2.
const STEPS = ["Service & Barber", "Time & Details"] as const;

function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ----------------------------------------------------------------- component

export function BookingWizard({
  services,
  staff,
  settings,
  preselectServiceSlug,
  preselectBarberSlug,
}: {
  services: WizardService[];
  staff: WizardStaff[];
  settings: WizardSettings;
  preselectServiceSlug?: string;
  preselectBarberSlug?: string;
}) {
  const presetService = services.find((s) => s.slug === preselectServiceSlug);
  const presetBarber = staff.find((s) => s.slug === preselectBarberSlug);

  const [step, setStep] = React.useState(0);
  const [serviceId, setServiceId] = React.useState<string | null>(presetService?.id ?? null);
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [staffId, setStaffId] = React.useState<string>(presetBarber?.id ?? (settings.allowAnyBarber ? "any" : ""));
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const availabilityCache = React.useRef(new Map<string, Slot[]>());
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ reference: string; manageToken: string } | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const selectedAddons = service?.addons.filter((a) => addonIds.includes(a.id)) ?? [];
  const totalDuration = (service?.durationMin ?? 0) + selectedAddons.reduce((s, a) => s + a.durationMin, 0);
  const totalPrice = (service?.priceCents ?? 0) + selectedAddons.reduce((s, a) => s + a.priceCents, 0);
  const eligibleStaff = service ? staff.filter((s) => service.staffIds.includes(s.id)) : staff;
  const dateKey = date ? dateToKey(date) : null;
  const eligibleStaffKey = eligibleStaff.map((s) => s.id).join(",");

  React.useEffect(() => {
    if (!service) return;
    if (settings.allowAnyBarber) return;
    if (!staffId || staffId === "any" || !service.staffIds.includes(staffId)) {
      setStaffId(eligibleStaff[0]?.id ?? "");
    }
  }, [service, settings.allowAnyBarber, staffId, eligibleStaffKey, eligibleStaff]);

  // Fetch availability whenever the active time-step inputs change.
  React.useEffect(() => {
    if (step !== 1) return;
    if (!serviceId || !dateKey || (!settings.allowAnyBarber && !staffId)) {
      setSlots([]);
      return;
    }
    const cacheKey = JSON.stringify({
      serviceId,
      dateKey,
      staffId: staffId || "any",
      addonIds: [...addonIds].sort(),
    });
    const cached = availabilityCache.current.get(cacheKey);
    if (cached) {
      setSlot((current) => (current && cached.some((s) => s.startMinute === current.startMinute) ? current : null));
      setSlots(cached);
      setLoadingSlots(false);
      return;
    }
    const controller = new AbortController();
    setLoadingSlots(true);
    setSlot(null);
    const params = new URLSearchParams({ serviceId, date: dateKey });
    if (staffId && staffId !== "any") params.set("staffId", staffId);
    addonIds.forEach((id) => params.append("addonId", id));

    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        const next = json.ok ? (json.data.slots as Slot[]) : [];
        availabilityCache.current.set(cacheKey, next);
        setSlots(next);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });

    return () => controller.abort();
  }, [step, serviceId, dateKey, staffId, addonIds, settings.allowAnyBarber]);

  // Step 1 gate: a service is chosen and a barber (or "any") is selected.
  const canAdvance = !!serviceId && (settings.allowAnyBarber || !!staffId);

  function validateDetails(setState = true): boolean {
    const e: Record<string, string> = {};
    const hasEmail = Boolean(customer.email.trim());
    const hasPhone = Boolean(customer.phone.trim());
    if (settings.requireCustomerName && !customer.name.trim()) e["customer.name"] = "Name is required";
    if (!hasEmail && !hasPhone) e["customer.phone"] = "Enter a phone number or email address";
    if (settings.requireCustomerEmail && !hasEmail) e["customer.email"] = "Email is required";
    if (hasEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) e["customer.email"] = "Enter a valid email";
    if (settings.requireCustomerPhone && !hasPhone) e["customer.phone"] = "Phone is required";
    if (hasPhone && customer.phone.replace(/[^0-9]/g, "").length < 7) e["customer.phone"] = "Enter a valid phone number";
    if (settings.requireCustomerNotes && !customer.notes.trim()) e["customer.notes"] = "Notes are required";
    if (setState) setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!service || !slot || !dateKey) return;
    // Details live on step 1 already; just surface any inline errors.
    if (!validateDetails(true)) return;
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          staffId: staffId === "any" ? null : staffId,
          date: dateKey,
          startMinute: slot.startMinute,
          addonIds,
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
            notes: customer.notes.trim(),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Could not complete your booking.");
        if (json.fields) {
          // Field errors render inline on this same step.
          setErrors(json.fields);
          return;
        }
        // If the slot was taken, drop the stale availability cache and the
        // selected slot — otherwise the cached list re-selects the very slot
        // that was just taken, looping the 409. Stay on step 1 (the calendar).
        if (json.code === "slot_taken" || json.code === "slot_unavailable") {
          availabilityCache.current.clear();
          setSlot(null);
        }
        return;
      }
      setResult(json.data);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <SuccessScreen result={result} service={service!} staffName={staff.find((s) => s.id === staffId)?.name} date={date!} slot={slot!} totalPrice={totalPrice} settings={settings} />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl min-w-0">
      {/* Progress */}
      <div className="mb-8 min-w-0">
        <div className="flex min-w-0 items-center justify-between">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-label={`Step ${i + 1}: ${label}`}
                aria-current={i === step ? "step" : undefined}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold transition-colors",
                    i < step
                      ? "border-primary bg-primary text-primary-foreground"
                      : i === step
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("hidden text-xs sm:block", i === step ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("mx-1 h-px flex-1 transition-colors", i < step ? "bg-primary" : "bg-border")} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8">
        {settings.bookingHelpText && (
          <p className="mb-5 rounded-lg border border-border bg-background/40 p-3 text-sm text-muted-foreground">
            {settings.bookingHelpText}
          </p>
        )}
        <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none">
            {step === 0 && (
              <div className="space-y-8">
                <ServiceStep
                  services={services}
                  serviceId={serviceId}
                  addonIds={addonIds}
                  onSelectService={(id) => {
                    setServiceId(id);
                    setAddonIds([]);
                    // Reset barber if it can't perform the new service.
                    const svc = services.find((s) => s.id === id);
                    if (svc && (staffId === "any" ? !settings.allowAnyBarber : !svc.staffIds.includes(staffId))) {
                      setStaffId(settings.allowAnyBarber ? "any" : staff.find((s) => svc.staffIds.includes(s.id))?.id ?? "");
                    }
                  }}
                  onToggleAddon={(id) =>
                    setAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                  }
                  currency={settings.currency}
                />
                <div className="border-t border-border pt-7">
                  <BarberStep
                    staff={eligibleStaff}
                    staffId={staffId}
                    onSelect={setStaffId}
                    allowAnyBarber={settings.allowAnyBarber}
                    disabled={!serviceId}
                  />
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-8">
                <TimeStep
                  date={date}
                  setDate={(d) => {
                    setDate(d);
                    setSlot(null);
                  }}
                  slots={slots}
                  slot={slot}
                  setSlot={setSlot}
                  loading={loadingSlots}
                  maxAdvanceDays={settings.maxAdvanceDays}
                  totalDuration={totalDuration}
                />
                <div className="border-t border-border pt-7">
                  <DetailsStep customer={customer} setCustomer={setCustomer} errors={errors} settings={settings} />
                </div>
                {service && slot && date && (
                  <div className="border-t border-border pt-7">
                    <ConfirmStep
                      service={service}
                      addons={selectedAddons}
                      staffName={staffId === "any" ? "Any available barber" : staff.find((s) => s.id === staffId)?.name}
                      date={date}
                      slot={slot}
                      totalPrice={totalPrice}
                      totalDuration={totalDuration}
                      customer={customer}
                      settings={settings}
                    />
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {service && (
            <div className="hidden text-right text-sm sm:block">
              <span className="text-muted-foreground">{service.name}</span>
              <span className="mx-2 text-border">·</span>
              <span className="font-semibold">{formatMoney(totalPrice, settings.currency)}</span>
              <span className="text-muted-foreground"> · {totalDuration} min</span>
            </div>
          )}
          {step === 0 ? (
            <Button onClick={() => canAdvance && setStep(1)} disabled={!canAdvance}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting} disabled={!slot}>
              Confirm Booking <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- steps

function ServiceStep({
  services,
  serviceId,
  addonIds,
  onSelectService,
  onToggleAddon,
  currency,
}: {
  services: WizardService[];
  serviceId: string | null;
  addonIds: string[];
  onSelectService: (id: string) => void;
  onToggleAddon: (id: string) => void;
  currency: string;
}) {
  const categories = Array.from(new Set(services.map((s) => s.categoryName)));
  const selected = services.find((s) => s.id === serviceId);

  return (
    <div>
      <StepTitle icon={Scissors} title="Choose your service" subtitle="Select the service you'd like to book." />
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
              {services
                .filter((s) => s.categoryName === cat)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelectService(s.id)}
                    className={cn(
                      "premium-card flex min-h-[92px] w-full min-w-0 items-center gap-3 p-3.5 text-left",
                      serviceId === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40",
                    )}
                  >
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", serviceId === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-primary")}>
                      <ServiceIcon name={s.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.durationMin} min</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{formatMoney(s.priceCents, currency)}</span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {selected && selected.addons.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
          <p className="mb-3 text-sm font-medium">Add a little extra</p>
          <div className="flex flex-wrap gap-2">
            {selected.addons.map((a) => {
              const on = addonIds.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => onToggleAddon(a.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200 active:scale-95",
                    on ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" />}
                  {a.name}
                  <span className="text-xs text-muted-foreground">+{formatMoney(a.priceCents, currency)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BarberStep({
  staff,
  staffId,
  onSelect,
  allowAnyBarber,
  disabled,
}: {
  staff: WizardStaff[];
  staffId: string;
  onSelect: (id: string) => void;
  allowAnyBarber: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={cn(disabled && "pointer-events-none opacity-50")} aria-disabled={disabled}>
      <StepTitle
        icon={User}
        title="Pick your barber"
        subtitle={
          disabled
            ? "Choose a service above first."
            : allowAnyBarber
              ? "Choose a specific barber or let us match you with the first available."
              : "Choose the barber you would like to book."
        }
      />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {allowAnyBarber && (
          <button
            onClick={() => onSelect("any")}
            className={cn(
              "premium-card flex min-h-[96px] items-center gap-3 p-4 text-left",
              staffId === "any" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Scissors className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-medium">Any available barber</span>
              <span className="text-xs text-muted-foreground">Fastest availability</span>
            </span>
          </button>
        )}
        {staff.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              "premium-card flex min-h-[96px] items-center gap-3 p-4 text-left",
              staffId === s.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40",
            )}
          >
            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
              {s.photoUrl && (
                <span className="relative block h-full w-full">
                  <Image
                    src={s.photoUrl}
                    alt={s.name}
                    fill
                    sizes="48px"
                    unoptimized={!shouldOptimizeImage(s.photoUrl)}
                    className="object-cover"
                  />
                </span>
              )}
            </span>
            <span>
              <span className="block font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.title}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeStep({
  date,
  setDate,
  slots,
  slot,
  setSlot,
  loading,
  maxAdvanceDays,
  totalDuration,
}: {
  date: Date | undefined;
  setDate: (d: Date | undefined) => void;
  slots: Slot[];
  slot: Slot | null;
  setSlot: (s: Slot) => void;
  loading: boolean;
  maxAdvanceDays: number;
  totalDuration: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + maxAdvanceDays);

  return (
    <div>
      <StepTitle icon={CalendarDays} title="Choose a date & time" subtitle={`Showing live availability for a ${totalDuration}-minute appointment.`} />
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="rounded-xl border border-border bg-background/40">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={[{ before: today }, { after: max }]}
            defaultMonth={date ?? today}
          />
        </div>

        <div className="min-h-[260px]">
          {!date ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Select a date to see available times
            </div>
          ) : loading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <Clock className="h-6 w-6" />
              No availability on this day. Please try another date.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  key={s.startMinute}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded-lg border py-2.5 text-sm font-medium transition-all active:scale-[0.97]",
                    slot?.startMinute === s.startMinute
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50 hover:bg-primary/5",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsStep({
  customer,
  setCustomer,
  errors,
  settings,
}: {
  customer: { name: string; email: string; phone: string; notes: string };
  setCustomer: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; notes: string }>>;
  errors: Record<string, string>;
  settings: WizardSettings;
}) {
  return (
    <div>
      <StepTitle icon={User} title="Your details" subtitle="We'll use these to confirm your appointment." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="name" required={settings.requireCustomerName} error={errors["customer.name"]}>
          <Input id="name" value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="John Smith" autoComplete="name" />
        </Field>
        <Field label="Phone" htmlFor="phone" required={settings.requireCustomerPhone} error={errors["customer.phone"]}>
          <Input id="phone" value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="905-555-0199" autoComplete="tel" inputMode="tel" />
        </Field>
        <Field label="Email" htmlFor="email" required={settings.requireCustomerEmail} error={errors["customer.email"]} className="sm:col-span-2">
          <Input id="email" type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} placeholder="john@email.com" autoComplete="email" />
        </Field>
        <Field
          label={settings.requireCustomerNotes ? "Notes" : "Notes (optional)"}
          htmlFor="notes"
          className="sm:col-span-2"
          hint={settings.bookingNotesHelpText || "Anything we should know? Style references, allergies, etc."}
          required={settings.requireCustomerNotes}
          error={errors["customer.notes"]}
        >
          <Textarea id="notes" value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} placeholder="e.g. Skin fade, scissors on top" />
        </Field>
      </div>
    </div>
  );
}

function ConfirmStep({
  service,
  addons,
  staffName,
  date,
  slot,
  totalPrice,
  totalDuration,
  customer,
  settings,
}: {
  service: WizardService;
  addons: WizardAddon[];
  staffName?: string;
  date: Date;
  slot: Slot;
  totalPrice: number;
  totalDuration: number;
  customer: { name: string; email: string; phone: string; notes: string };
  settings: WizardSettings;
}) {
  const deposit = settings.depositRequired ? service.depositCents : 0;
  return (
    <div>
      <StepTitle icon={Check} title="Review & confirm" subtitle="Almost there — please double-check the details." />
      <div className="space-y-3 rounded-xl border border-border bg-background/40 p-5">
        <Row label="Service" value={service.name} />
        {addons.length > 0 && <Row label="Add-ons" value={addons.map((a) => a.name).join(", ")} />}
        <Row label="Barber" value={staffName ?? "Any available barber"} />
        <Row label="When" value={`${date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${slot.label}`} />
        <Row label="Duration" value={`${totalDuration} minutes`} />
        <div className="rule-fade my-1" />
        <Row label="Total" value={formatMoney(totalPrice, settings.currency)} emphasis />
        {deposit > 0 && <Row label="Deposit due" value={formatMoney(deposit, settings.currency)} />}
        <div className="rule-fade my-1" />
        {customer.name && <Row label="Name" value={customer.name} />}
        <Row label="Contact" value={[customer.phone, customer.email].filter(Boolean).join(" - ")} />
        {customer.notes && <Row label="Notes" value={customer.notes} />}
      </div>
      {settings.cancellationPolicy && (
        <p className="mt-4 text-xs text-muted-foreground">{settings.cancellationPolicy}</p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- success

function SuccessScreen({
  result,
  service,
  staffName,
  date,
  slot,
  totalPrice,
  settings,
}: {
  result: { reference: string; manageToken: string };
  service: WizardService;
  staffName?: string;
  date: Date;
  slot: Slot;
  totalPrice: number;
  settings: WizardSettings;
}) {
  const manageUrl = `/booking/${result.manageToken}`;
  return (
    <div className="mx-auto max-w-xl animate-in fade-in zoom-in-95 duration-200 text-center motion-reduce:animate-none">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/15 text-primary animate-in zoom-in duration-300">
        <PartyPopper className="h-8 w-8" />
      </div>
      <h2 className="font-display text-3xl font-bold">{settings.bookingConfirmationTitle}</h2>
      <p className="mt-2 text-muted-foreground">
        {settings.bookingConfirmationText}
      </p>

      <div className="mt-7 rounded-xl border border-border bg-card p-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Booking reference</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.reference);
              toast.success("Reference copied");
            }}
            className="flex items-center gap-1.5 font-mono text-lg font-bold text-primary"
          >
            {result.reference} <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="rule-fade my-4" />
        <Row label="Service" value={service.name} />
        <Row label="Barber" value={staffName ?? "Any available barber"} />
        <Row label="When" value={`${date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · ${slot.label}`} />
        <Row label="Total" value={formatMoney(totalPrice, settings.currency)} emphasis />
      </div>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <a href={`/api/bookings/${result.manageToken}/ics`}>
            <CalendarPlus className="h-4 w-4" /> Add to calendar
          </a>
        </Button>
        <Button asChild>
          <Link href={manageUrl}>Manage booking</Link>
        </Button>
      </div>
      <Link href="/" className="mt-6 inline-block text-sm text-muted-foreground hover:text-primary">
        Back to home
      </Link>
    </div>
  );
}

// ----------------------------------------------------------------- bits

function StepTitle({ icon: Icon, title, subtitle }: { icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm", emphasis ? "font-display text-lg font-bold" : "font-medium")}>{value}</span>
    </div>
  );
}
