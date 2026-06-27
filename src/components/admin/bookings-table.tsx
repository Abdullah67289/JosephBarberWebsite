"use client";

import * as React from "react";
import { MoreHorizontal, Check, X, UserX, CalendarClock, Pencil, Phone, Mail } from "lucide-react";
import { adminSetBookingStatus, adminRescheduleBooking, adminUpdateBooking } from "@/server/booking-admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CalendarDays } from "lucide-react";
import { useAction } from "./use-action";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  reference: string;
  status: string;
  startISO: string;
  serviceName: string;
  serviceId: string;
  staffId: string | null;
  staffName: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  internalNotes: string | null;
  priceCents: number;
  source: string;
}

export function BookingsTable({
  bookings,
  staff,
  timezone,
  currency,
  maxAdvanceDays,
}: {
  bookings: Booking[];
  staff: { id: string; name: string }[];
  timezone: string;
  currency: string;
  maxAdvanceDays: number;
}) {
  if (bookings.length === 0) {
    return <EmptyState icon={CalendarDays} title="No bookings found" description="Try adjusting your filters, or create a booking." />;
  }
  return (
    <div className="luxury-surface overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/25 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-4 font-medium">When</th>
            <th className="p-4 font-medium">Customer</th>
            <th className="hidden p-4 font-medium md:table-cell">Service</th>
            <th className="hidden p-4 font-medium lg:table-cell">Barber</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} staff={staff} timezone={timezone} currency={currency} maxAdvanceDays={maxAdvanceDays} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingRow({ booking, staff, timezone, currency, maxAdvanceDays }: { booking: Booking; staff: { id: string; name: string }[]; timezone: string; currency: string; maxAdvanceDays: number }) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);

  const when = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(booking.startISO));

  return (
    <tr className="transition-colors hover:bg-secondary/40">
      <td className="whitespace-nowrap p-4 font-medium">{when}</td>
      <td className="p-4">
        <p className="font-medium">{booking.customerName}</p>
        <p className="text-xs text-muted-foreground">{booking.customerPhone || booking.customerEmail || "No contact"}</p>
      </td>
      <td className="hidden p-4 md:table-cell">{booking.serviceName}</td>
      <td className="hidden p-4 text-muted-foreground lg:table-cell">{booking.staffName ?? "Any"}</td>
      <td className="p-4"><StatusBadge status={booking.status} /></td>
      <td className="p-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setOpen(true)}><Pencil className="h-4 w-4" /> View / edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => run(() => adminSetBookingStatus(booking.id, "confirmed"), { success: "Confirmed." })}><Check className="h-4 w-4" /> Confirm</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(() => adminSetBookingStatus(booking.id, "completed"), { success: "Completed." })}><Check className="h-4 w-4" /> Complete</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run(() => adminSetBookingStatus(booking.id, "no_show"), { success: "Marked no-show." })}><UserX className="h-4 w-4" /> No-show</DropdownMenuItem>
            <DropdownMenuItem className="text-red-400" onClick={() => run(() => adminSetBookingStatus(booking.id, "cancelled"), { success: "Cancelled." })}><X className="h-4 w-4" /> Cancel</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <BookingDialog open={open} onOpenChange={setOpen} booking={booking} staff={staff} timezone={timezone} currency={currency} maxAdvanceDays={maxAdvanceDays} busy={busy} run={run} />
      </td>
    </tr>
  );
}

function BookingDialog({
  open,
  onOpenChange,
  booking,
  staff,
  timezone,
  currency,
  maxAdvanceDays,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: Booking;
  staff: { id: string; name: string }[];
  timezone: string;
  currency: string;
  maxAdvanceDays: number;
  busy: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const action = useAction();
  const [internalNotes, setInternalNotes] = React.useState(booking.internalNotes ?? "");
  const [customer, setCustomer] = React.useState({
    name: booking.customerName,
    phone: booking.customerPhone ?? "",
    email: booking.customerEmail ?? "",
    notes: booking.notes ?? "",
  });
  const [staffId, setStaffId] = React.useState(booking.staffId ?? "any");

  // reschedule state
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<{ startMinute: number; label: string }[]>([]);
  const [slot, setSlot] = React.useState<{ startMinute: number; label: string } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const when = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(booking.startISO));

  const dateKey = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : null;

  React.useEffect(() => {
    if (!open || !dateKey) {
      setSlots([]);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    setSlot(null);
    const params = new URLSearchParams({ serviceId: booking.serviceId, date: dateKey });
    if (staffId !== "any") params.set("staffId", staffId);
    fetch(`/api/availability?${params}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => setSlots(j.ok ? j.data.slots : []))
      .catch((e) => e.name !== "AbortError" && setSlots([]))
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [open, dateKey, staffId, booking.serviceId]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const max = new Date(today);
  max.setDate(max.getDate() + maxAdvanceDays);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{booking.reference} · {booking.customerName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="reschedule">Reschedule</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-background/40 p-4 text-sm">
                <Row label="Service" value={booking.serviceName} />
                <Row label="When" value={when} />
                <Row label="Status" value={booking.status} />
                <Row label="Total" value={formatMoney(booking.priceCents, currency)} />
                <div className="mt-2 flex gap-4 border-t border-border pt-2 text-muted-foreground">
                  {booking.customerPhone && <a href={`tel:${booking.customerPhone}`} className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-4 w-4" /> {booking.customerPhone}</a>}
                  {booking.customerEmail && <a href={`mailto:${booking.customerEmail}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-4 w-4" /> {booking.customerEmail}</a>}
                </div>
                {booking.notes && <p className="mt-2 text-muted-foreground">Customer note: {booking.notes}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Customer name">
                  <Input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} />
                </Field>
                <Field label="Phone">
                  <Input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <Input type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} />
                </Field>
                <Field label="Customer note" className="sm:col-span-2">
                  <Textarea value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} rows={2} />
                </Field>
              </div>

              <Field label="Reassign barber">
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available</SelectItem>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Internal notes">
                <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} />
              </Field>
              <Button
                onClick={() =>
                  action.run(
                    () =>
                      adminUpdateBooking(booking.id, {
                        internalNotes,
                        notes: customer.notes,
                        staffId,
                        customer: {
                          name: customer.name,
                          phone: customer.phone,
                          email: customer.email,
                        },
                      }),
                    { success: "Saved." },
                  )
                }
                loading={action.busy}
              >
                Save changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reschedule">
            <div className="space-y-4">
              <Field label="Barber">
                <Select value={staffId} onValueChange={setStaffId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available</SelectItem>
                    {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
                <div className="rounded-xl border border-border bg-background/40">
                  <Calendar mode="single" selected={date} onSelect={setDate} disabled={[{ before: today }, { after: max }]} />
                </div>
                <div className="min-h-[200px]">
                  {!date ? (
                    <p className="grid h-full place-items-center text-sm text-muted-foreground">Pick a date</p>
                  ) : loading ? (
                    <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-9" />)}</div>
                  ) : slots.length === 0 ? (
                    <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">No availability</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <button key={s.startMinute} onClick={() => setSlot(s)} className={cn("rounded-lg border py-2 text-sm transition-colors", slot?.startMinute === s.startMinute ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50")}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button
                disabled={!slot}
                loading={action.busy}
                onClick={async () => {
                  if (!dateKey || !slot) return;
                  const res = await action.run(() => adminRescheduleBooking(booking.id, { date: dateKey, startMinute: slot.startMinute, staffId: staffId === "any" ? null : staffId }), { success: "Rescheduled." });
                  if (res.ok) onOpenChange(false);
                }}
              >
                <CalendarClock className="h-4 w-4" /> Confirm new time
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
