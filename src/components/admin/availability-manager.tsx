"use client";

import * as React from "react";
import { Save, Plus, CalendarOff, Coffee, CalendarRange } from "lucide-react";
import {
  saveBusinessHours,
  saveStaffHours,
  saveBreak,
  deleteBreak,
  saveClosure,
  deleteClosure,
  saveSpecialHour,
  deleteSpecialHour,
} from "@/server/availability-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { TimeInput } from "./inputs";
import { useAction } from "./use-action";
import { minutesToLabel } from "@/lib/time";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type Hour = { dayOfWeek: number; isOpen: boolean; openMinute: number; closeMinute: number };
type StaffHour = { dayOfWeek: number; isWorking: boolean; startMinute: number; endMinute: number };
type StaffLite = { id: string; name: string };
type BreakRow = { id: string; staffId: string | null; dayOfWeek: number; startMinute: number; endMinute: number; title: string };
type Closure = { id: string; title: string; type: string; startDate: string; endDate: string; staffId: string | null };
type Special = { id: string; date: string; staffId: string | null; isClosed: boolean; openMinute: number | null; closeMinute: number | null };

export function AvailabilityManager({
  businessHours,
  staff,
  staffHours,
  breaks,
  closures,
  specialHours,
}: {
  businessHours: Hour[];
  staff: StaffLite[];
  staffHours: Record<string, StaffHour[]>;
  breaks: BreakRow[];
  closures: Closure[];
  specialHours: Special[];
}) {
  const staffName = (id: string | null) => (id ? staff.find((s) => s.id === id)?.name ?? "Unknown" : "Whole shop");

  return (
    <div>
      <AdminPageHeader title="Availability" description="Control opening hours, breaks, holidays and special days." />
      <Tabs defaultValue="business">
        <TabsList className="flex-wrap">
          <TabsTrigger value="business">Business Hours</TabsTrigger>
          <TabsTrigger value="staff">Barber Hours</TabsTrigger>
          <TabsTrigger value="breaks">Breaks</TabsTrigger>
          <TabsTrigger value="closures">Closures</TabsTrigger>
          <TabsTrigger value="special">Special Days</TabsTrigger>
        </TabsList>

        <TabsContent value="business"><BusinessHoursEditor initial={businessHours} /></TabsContent>
        <TabsContent value="staff"><StaffHoursEditor staff={staff} staffHours={staffHours} businessHours={businessHours} /></TabsContent>
        <TabsContent value="breaks"><BreaksEditor breaks={breaks} staff={staff} staffName={staffName} /></TabsContent>
        <TabsContent value="closures"><ClosuresEditor closures={closures} staff={staff} staffName={staffName} /></TabsContent>
        <TabsContent value="special"><SpecialEditor special={specialHours} staff={staff} staffName={staffName} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------------------------------------------------------- business hours

function BusinessHoursEditor({ initial }: { initial: Hour[] }) {
  const { busy, run } = useAction();
  const [rows, setRows] = React.useState<Hour[]>(() =>
    DAY_ORDER.map((d) => initial.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, isOpen: false, openMinute: 540, closeMinute: 1020 }),
  );
  const update = (d: number, patch: Partial<Hour>) => setRows((p) => p.map((r) => (r.dayOfWeek === d ? { ...r, ...patch } : r)));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="w-24 text-sm font-medium">{DAYS[r.dayOfWeek]}</span>
            <Switch checked={r.isOpen} onCheckedChange={(v) => update(r.dayOfWeek, { isOpen: v })} />
            <span className="w-16 text-sm text-muted-foreground">{r.isOpen ? "Open" : "Closed"}</span>
            {r.isOpen && (
              <div className="flex items-center gap-2">
                <TimeInput minutes={r.openMinute} onChange={(m) => update(r.dayOfWeek, { openMinute: m })} />
                <span className="text-muted-foreground">to</span>
                <TimeInput minutes={r.closeMinute} onChange={(m) => update(r.dayOfWeek, { closeMinute: m })} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => run(() => saveBusinessHours(rows), { success: "Business hours saved." })} loading={busy}>
          <Save className="h-4 w-4" /> Save hours
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- staff hours

function StaffHoursEditor({ staff, staffHours, businessHours }: { staff: StaffLite[]; staffHours: Record<string, StaffHour[]>; businessHours: Hour[] }) {
  const { busy, run } = useAction();
  const [staffId, setStaffId] = React.useState(staff[0]?.id ?? "");
  const seed = React.useCallback(
    (id: string): StaffHour[] =>
      DAY_ORDER.map((d) => {
        const existing = staffHours[id]?.find((h) => h.dayOfWeek === d);
        if (existing) return existing;
        const bh = businessHours.find((h) => h.dayOfWeek === d);
        return { dayOfWeek: d, isWorking: bh?.isOpen ?? false, startMinute: bh?.openMinute ?? 540, endMinute: bh?.closeMinute ?? 1020 };
      }),
    [staffHours, businessHours],
  );
  const [rows, setRows] = React.useState<StaffHour[]>(() => seed(staffId));
  React.useEffect(() => setRows(seed(staffId)), [staffId, seed]);
  const update = (d: number, patch: Partial<StaffHour>) => setRows((p) => p.map((r) => (r.dayOfWeek === d ? { ...r, ...patch } : r)));

  if (staff.length === 0) return <p className="rounded-xl border border-border bg-card p-6 text-muted-foreground">Add barbers first.</p>;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 max-w-xs">
        <Field label="Barber">
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
            <span className="w-24 text-sm font-medium">{DAYS[r.dayOfWeek]}</span>
            <Switch checked={r.isWorking} onCheckedChange={(v) => update(r.dayOfWeek, { isWorking: v })} />
            <span className="w-16 text-sm text-muted-foreground">{r.isWorking ? "Working" : "Off"}</span>
            {r.isWorking && (
              <div className="flex items-center gap-2">
                <TimeInput minutes={r.startMinute} onChange={(m) => update(r.dayOfWeek, { startMinute: m })} />
                <span className="text-muted-foreground">to</span>
                <TimeInput minutes={r.endMinute} onChange={(m) => update(r.dayOfWeek, { endMinute: m })} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => run(() => saveStaffHours(staffId, rows), { success: "Barber hours saved." })} loading={busy}>
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- breaks

function BreaksEditor({ breaks, staff, staffName }: { breaks: BreakRow[]; staff: StaffLite[]; staffName: (id: string | null) => string }) {
  const { busy, run } = useAction();
  const [scope, setScope] = React.useState("shop");
  const [day, setDay] = React.useState("1");
  const [start, setStart] = React.useState(12 * 60);
  const [end, setEnd] = React.useState(13 * 60);
  const [title, setTitle] = React.useState("Lunch");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium"><Coffee className="h-4 w-4 text-primary" /> Add a recurring break</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Applies to" className="lg:col-span-1">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shop">Whole shop</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Day">
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAY_ORDER.map((d) => <SelectItem key={d} value={String(d)}>{DAYS[d]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="From"><TimeInput minutes={start} onChange={setStart} /></Field>
          <Field label="To"><TimeInput minutes={end} onChange={setEnd} /></Field>
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Button loading={busy} onClick={() => run(() => saveBreak({ staffId: scope === "shop" ? null : scope, dayOfWeek: Number(day), startMinute: start, endMinute: end, title }), { success: "Break added." })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Rows
          items={breaks}
          empty="No breaks configured."
          render={(b) => (
            <>
              <span className="font-medium">{b.title}</span>
              <span className="text-muted-foreground">{staffName(b.staffId)} · {DAYS[b.dayOfWeek]} · {minutesToLabel(b.startMinute)}–{minutesToLabel(b.endMinute)}</span>
            </>
          )}
          onDelete={(id) => deleteBreak(id)}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- closures

function ClosuresEditor({ closures, staff, staffName }: { closures: Closure[]; staff: StaffLite[]; staffName: (id: string | null) => string }) {
  const { busy, run } = useAction();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("holiday");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [scope, setScope] = React.useState("shop");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium"><CalendarOff className="h-4 w-4 text-primary" /> Add a closure, holiday or blackout</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Title" className="lg:col-span-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Canada Day" /></Field>
          <Field label="Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">Holiday</SelectItem>
                <SelectItem value="closure">Closure</SelectItem>
                <SelectItem value="blackout">Blackout</SelectItem>
                <SelectItem value="vacation">Vacation</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="From"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="To"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          <Field label="Applies to">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shop">Whole shop</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <Button loading={busy} onClick={() => run(() => saveClosure({ title, type, startDate, endDate: endDate || startDate, staffId: scope === "shop" ? null : scope }), { success: "Closure added." }).then((r) => { if (r.ok) { setTitle(""); setStartDate(""); setEndDate(""); } })}>
            <Plus className="h-4 w-4" /> Add closure
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Rows
          items={closures}
          empty="No closures scheduled."
          render={(c) => (
            <>
              <span className="font-medium capitalize">{c.title} <span className="text-xs text-muted-foreground">({c.type})</span></span>
              <span className="text-muted-foreground">{staffName(c.staffId)} · {c.startDate}{c.endDate !== c.startDate ? ` → ${c.endDate}` : ""}</span>
            </>
          )}
          onDelete={(id) => deleteClosure(id)}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- special days

function SpecialEditor({ special, staff, staffName }: { special: Special[]; staff: StaffLite[]; staffName: (id: string | null) => string }) {
  const { busy, run } = useAction();
  const [date, setDate] = React.useState("");
  const [scope, setScope] = React.useState("shop");
  const [isClosed, setIsClosed] = React.useState(false);
  const [open, setOpen] = React.useState(10 * 60);
  const [close, setClose] = React.useState(15 * 60);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 font-medium"><CalendarRange className="h-4 w-4 text-primary" /> Override hours for a specific date</h3>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Applies to">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shop">Whole shop</SelectItem>
                {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Closed all day">
            <div className="flex h-11 items-center"><Switch checked={isClosed} onCheckedChange={setIsClosed} /></div>
          </Field>
          {!isClosed && <Field label="Open"><TimeInput minutes={open} onChange={setOpen} /></Field>}
          {!isClosed && <Field label="Close"><TimeInput minutes={close} onChange={setClose} /></Field>}
          <Button loading={busy} onClick={() => run(() => saveSpecialHour({ date, staffId: scope === "shop" ? null : scope, isClosed, openMinute: open, closeMinute: close }), { success: "Special day saved." }).then((r) => { if (r.ok) setDate(""); })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Rows
          items={special}
          empty="No special days set."
          render={(s) => (
            <>
              <span className="font-medium">{s.date}</span>
              <span className="text-muted-foreground">{staffName(s.staffId)} · {s.isClosed ? "Closed" : `${minutesToLabel(s.openMinute ?? 0)}–${minutesToLabel(s.closeMinute ?? 0)}`}</span>
            </>
          )}
          onDelete={(id) => deleteSpecialHour(id)}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- shared list

function Rows<T extends { id: string }>({
  items,
  render,
  onDelete,
  empty,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  onDelete: (id: string) => Promise<{ ok: boolean; error?: string }>;
  empty: string;
}) {
  if (items.length === 0) return <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-col text-sm sm:flex-row sm:items-center sm:gap-3">{render(item)}</div>
          <ConfirmDelete title="Remove this?" onConfirm={() => onDelete(item.id)} success="Removed." />
        </li>
      ))}
    </ul>
  );
}
