"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarPlus,
  CalendarClock,
  XCircle,
  Phone,
  Clock,
  Scissors,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Slot {
  startMinute: number;
  label: string;
}

interface BookingData {
  reference: string;
  status: string;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  startISO: string;
  durationMin: number;
  priceCents: number;
  notes: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BookingManager({
  token,
  booking,
  staff,
  settings,
  canModify,
  cutoffHours,
}: {
  token: string;
  booking: BookingData;
  staff: { id: string; name: string; slug: string; title: string; photoUrl: string | null }[];
  settings: { timezone: string; currency: string; maxAdvanceDays: number; cancellationPolicy?: string | null; phone: string; allowAnyBarber: boolean };
  canModify: boolean;
  cutoffHours: number;
}) {
  const router = useRouter();
  const [rescheduling, setRescheduling] = React.useState(false);
  const [staffId, setStaffId] = React.useState<string>(booking.staffId ?? (settings.allowAnyBarber ? "any" : staff[0]?.id ?? ""));
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [loading, setLoading] = React.useState(false);
  const availabilityCache = React.useRef(new Map<string, Slot[]>());
  const [busy, setBusy] = React.useState(false);

  const isCancelled = booking.status === "cancelled";
  const isPast = new Date(booking.startISO).getTime() < Date.now();
  const start = new Date(booking.startISO);

  const whenLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(start);

  const dateKey = date ? dateToKey(date) : null;

  React.useEffect(() => {
    if (!rescheduling || !dateKey || (!settings.allowAnyBarber && !staffId)) {
      setSlots([]);
      return;
    }
    const cacheKey = JSON.stringify({ serviceId: booking.serviceId, dateKey, staffId: staffId || "any" });
    const cached = availabilityCache.current.get(cacheKey);
    if (cached) {
      setSlots(cached);
      setSlot((current) => (current && cached.some((s) => s.startMinute === current.startMinute) ? current : null));
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setSlot(null);
    const params = new URLSearchParams({ serviceId: booking.serviceId, date: dateKey });
    if (staffId !== "any") params.set("staffId", staffId);
    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => {
        const next = j.ok ? j.data.slots : [];
        availabilityCache.current.set(cacheKey, next);
        setSlots(next);
      })
      .catch((e) => e.name !== "AbortError" && setSlots([]))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [rescheduling, dateKey, staffId, booking.serviceId, settings.allowAnyBarber]);

  async function confirmReschedule() {
    if (!dateKey || !slot) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, startMinute: slot.startMinute, staffId: staffId === "any" ? null : staffId }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error ?? "Could not reschedule.");
        return;
      }
      toast.success("Your appointment has been rescheduled.");
      setRescheduling(false);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${token}/cancel`, { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error(j.error ?? "Could not cancel.");
        return;
      }
      toast.success("Your appointment has been cancelled.");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + settings.maxAdvanceDays);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">{booking.reference}</span>
          <StatusBadge status={booking.status} />
        </div>
        <div className="rule-fade my-4" />
        <div className="space-y-2.5 text-sm">
          <Row icon={Scissors} label="Service" value={booking.serviceName} />
          <Row icon={User} label="Barber" value={booking.staffName ?? "Any available barber"} />
          <Row icon={CalendarClock} label="When" value={whenLabel} />
          <Row icon={Clock} label="Duration" value={`${booking.durationMin} minutes`} />
        </div>
        <div className="rule-fade my-4" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-display text-xl font-bold">{formatMoney(booking.priceCents, settings.currency)}</span>
        </div>
      </div>

      {isCancelled ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <XCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">This appointment has been cancelled.</p>
          <Button asChild className="mt-4">
            <Link href="/book">Book a new appointment</Link>
          </Button>
        </div>
      ) : isPast ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          This appointment has passed. We hope it was a great one!
          <div className="mt-4">
            <Button asChild>
              <Link href="/book">Book again</Link>
            </Button>
          </div>
        </div>
      ) : !canModify ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-600/30 bg-amber-500/10 p-4 text-sm text-amber-800">
            Changes can only be made online up to {cutoffHours} hours before your appointment. To make a change now,
            please call us.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <a href={`/api/bookings/${token}/ics`}>
                <CalendarPlus className="h-4 w-4" /> Add to calendar
              </a>
            </Button>
            <Button asChild className="flex-1">
              <a href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}>
                <Phone className="h-4 w-4" /> Call {settings.phone}
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!rescheduling ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" asChild>
                <a href={`/api/bookings/${token}/ics`}>
                  <CalendarPlus className="h-4 w-4" /> Add to calendar
                </a>
              </Button>
              <Button className="flex-1" onClick={() => setRescheduling(true)}>
                <CalendarClock className="h-4 w-4" /> Reschedule
              </Button>
              <CancelDialog onConfirm={confirmCancel} busy={busy} />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Pick a new time</h3>
                <Button variant="ghost" size="sm" onClick={() => setRescheduling(false)}>
                  Cancel
                </Button>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm text-muted-foreground">Barber</label>
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settings.allowAnyBarber && <SelectItem value="any">Any available barber</SelectItem>}
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 md:grid-cols-[auto_1fr]">
                <div className="rounded-xl border border-border bg-background/40">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={[{ before: today }, { after: max }]} defaultMonth={today} />
                </div>
                <div className="min-h-[220px]">
                  {!date ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                      Select a date
                    </div>
                  ) : loading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="skeleton h-10" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      No availability — try another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => (
                        <button
                          key={s.startMinute}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "rounded-lg border py-2.5 text-sm font-medium transition-all",
                            slot?.startMinute === s.startMinute
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button className="mt-5 w-full" onClick={confirmReschedule} disabled={!slot || busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                Confirm new time
              </Button>
            </div>
          )}
          {settings.cancellationPolicy && (
            <p className="text-center text-xs text-muted-foreground">{settings.cancellationPolicy}</p>
          )}
        </>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function CancelDialog({ onConfirm, busy }: { onConfirm: () => void; busy: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="flex-1">
          <XCircle className="h-4 w-4" /> Cancel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>This can&apos;t be undone. You&apos;ll need to make a new booking if you change your mind.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep booking</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} loading={busy}>
            Yes, cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
