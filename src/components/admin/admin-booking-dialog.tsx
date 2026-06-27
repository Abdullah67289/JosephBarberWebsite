"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { adminCreateBooking } from "@/server/booking-admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
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
import { useAction } from "./use-action";
import { cn } from "@/lib/utils";

interface Svc { id: string; name: string; staffIds: string[] }
interface Slot { startMinute: number; label: string }

export function AdminBookingDialog({
  services,
  staff,
  maxAdvanceDays,
}: {
  services: Svc[];
  staff: { id: string; name: string }[];
  timezone: string;
  currency: string;
  maxAdvanceDays: number;
}) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [serviceId, setServiceId] = React.useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = React.useState("any");
  const [date, setDate] = React.useState("");
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [slot, setSlot] = React.useState<Slot | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "", notes: "" });
  const [status, setStatus] = React.useState("confirmed");
  const [source, setSource] = React.useState("admin");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const service = services.find((s) => s.id === serviceId);
  const eligible = service ? staff.filter((s) => service.staffIds.includes(s.id)) : staff;

  React.useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    const ctl = new AbortController();
    setLoading(true);
    setSlot(null);
    const params = new URLSearchParams({ serviceId, date });
    if (staffId !== "any") params.set("staffId", staffId);
    fetch(`/api/availability?${params}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((j) => setSlots(j.ok ? j.data.slots : []))
      .catch((e) => e.name !== "AbortError" && setSlots([]))
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [serviceId, date, staffId]);

  async function save() {
    if (!slot) return;
    const res = await run(
      () =>
        adminCreateBooking({
          serviceId,
          staffId: staffId === "any" ? null : staffId,
          date,
          startMinute: slot.startMinute,
          addonIds: [],
          customer: { name: customer.name, email: customer.email, phone: customer.phone, notes: customer.notes },
          status,
          source,
        }),
      { success: "Booking created." },
    );
    if (res.ok) {
      setOpen(false);
      setCustomer({ name: "", email: "", phone: "", notes: "" });
      setDate("");
      setSlot(null);
    } else if (res.fieldErrors) setErrors(res.fieldErrors);
  }

  const today = new Date().toISOString().slice(0, 10);
  const max = new Date(Date.now() + maxAdvanceDays * 86400000).toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> New booking</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create booking</DialogTitle>
          <DialogDescription>Add a walk-in or phone booking. Availability is checked to prevent clashes.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service">
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setStaffId("any"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Barber">
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any available</SelectItem>
                {eligible.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" min={today} max={max} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            {!date ? (
              <p className="pt-2 text-sm text-muted-foreground">Pick a date first</p>
            ) : loading ? (
              <p className="pt-2 text-sm text-muted-foreground">Loading…</p>
            ) : slots.length === 0 ? (
              <p className="pt-2 text-sm text-muted-foreground">No availability</p>
            ) : (
              <Select value={slot ? String(slot.startMinute) : ""} onValueChange={(v) => setSlot(slots.find((s) => String(s.startMinute) === v) ?? null)}>
                <SelectTrigger><SelectValue placeholder="Choose time" /></SelectTrigger>
                <SelectContent>{slots.map((s) => <SelectItem key={s.startMinute} value={String(s.startMinute)}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Customer name" required error={errors["customer.name"]}><Input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} /></Field>
          <Field label="Phone" required error={errors["customer.phone"]}><Input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} /></Field>
          <Field label="Email" required error={errors["customer.email"]} className="sm:col-span-2"><Input type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} /></Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["pending", "confirmed", "completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Source">
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["admin", "walk_in"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={customer.notes} onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))} rows={2} /></Field>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} loading={busy} disabled={!slot} className={cn(!slot && "opacity-60")}>Create booking</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
