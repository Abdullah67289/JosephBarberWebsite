"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { saveStaff, deleteStaff } from "@/server/catalog-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
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
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { MediaInput } from "./media-input";
import { NumberInput, ToggleRow, Chip } from "./inputs";
import { useAction } from "./use-action";
import { shouldOptimizeImage } from "@/lib/image";

type Staff = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  color: string;
  displayOrder: number;
  isActive: boolean;
  showOnPublicSite: boolean;
  acceptsBookings: boolean;
  services: { serviceId: string }[];
};
type ServiceLite = { id: string; name: string };

export function StaffManager({ staff, services }: { staff: Staff[]; services: ServiceLite[] }) {
  return (
    <div>
      <AdminPageHeader
        title="Barbers"
        description="Manage your barbers, their profiles and which services they offer."
        action={
          <StaffDialog services={services}>
            <Button>
              <Plus className="h-4 w-4" /> New barber
            </Button>
          </StaffDialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 p-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-secondary" style={{ borderColor: m.color }}>
                {m.photoUrl && (
                  <div className="relative h-full w-full">
                    <Image
                      src={m.photoUrl}
                      alt={m.name}
                      fill
                      sizes="56px"
                      unoptimized={!shouldOptimizeImage(m.photoUrl)}
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.name}</p>
                <p className="truncate text-sm text-primary">{m.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 pb-2">
              {m.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Hidden</Badge>}
              {m.showOnPublicSite ? <Badge>Public</Badge> : <Badge variant="muted">Private</Badge>}
              {m.acceptsBookings ? <Badge>Bookable</Badge> : <Badge variant="warning">Not bookable</Badge>}
            </div>
            <div className="flex items-center justify-between border-t border-border px-2 py-2">
              <span className="px-2 text-xs text-muted-foreground">{m.services.length} services</span>
              <div className="flex gap-1">
                <StaffDialog services={services} staff={m}>
                  <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                </StaffDialog>
                <ConfirmDelete title={`Delete ${m.name}?`} description="Their bookings keep their record." onConfirm={() => deleteStaff(m.id)} success="Barber removed." />
              </div>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No barbers yet. Add your first one.
          </div>
        )}
      </div>
    </div>
  );
}

function StaffDialog({ services, staff, children }: { services: ServiceLite[]; staff?: Staff; children: React.ReactNode }) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(() => init(staff));

  React.useEffect(() => {
    if (open) {
      setForm(init(staff));
      setErrors({});
    }
  }, [open, staff]);

  const set = (k: keyof ReturnType<typeof init>, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const res = await run(
      () =>
        saveStaff({
          id: staff?.id,
          name: form.name,
          title: form.title,
          bio: form.bio || null,
          photoUrl: form.photoUrl || null,
          email: form.email || null,
          phone: form.phone || null,
          color: form.color,
          displayOrder: form.displayOrder,
          isActive: form.isActive,
          showOnPublicSite: form.showOnPublicSite,
          acceptsBookings: form.acceptsBookings,
          serviceIds: form.serviceIds,
        }),
      { success: staff ? "Barber updated." : "Barber added." },
    );
    if (res.ok) setOpen(false);
    else if (res.fieldErrors) setErrors(res.fieldErrors);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit barber" : "New barber"}</DialogTitle>
          <DialogDescription>Profile shown on the website and used for bookings.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name}><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Title"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Master Barber" /></Field>
          <Field label="Bio" className="sm:col-span-2"><Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={2} /></Field>
          <MediaInput label="Photo" value={form.photoUrl} onChange={(value) => set("photoUrl", value)} className="sm:col-span-2" />
          <Field label="Email" error={errors.email}><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Calendar colour"><Input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="h-11 w-20 p-1" /></Field>
          <Field label="Display order"><NumberInput value={form.displayOrder} onChange={(v) => set("displayOrder", v)} /></Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Services offered</p>
            <div className="flex flex-wrap gap-2">
              {services.map((sv) => (
                <Chip key={sv.id} active={form.serviceIds.includes(sv.id)} onClick={() => set("serviceIds", form.serviceIds.includes(sv.id) ? form.serviceIds.filter((x) => x !== sv.id) : [...form.serviceIds, sv.id])}>
                  {sv.name}
                </Chip>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 grid gap-2 sm:grid-cols-2">
            <ToggleRow label="Active" description="Keeps this barber enabled" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <ToggleRow label="Show on website" description="Appears in team/profile sections" checked={form.showOnPublicSite} onChange={(v) => set("showOnPublicSite", v)} />
            <ToggleRow label="Accepts bookings" description="Appears in the booking flow" checked={form.acceptsBookings} onChange={(v) => set("acceptsBookings", v)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} loading={busy}>{staff ? "Save changes" : "Add barber"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function init(s?: Staff) {
  return {
    name: s?.name ?? "",
    title: s?.title ?? "Barber",
    bio: s?.bio ?? "",
    photoUrl: s?.photoUrl ?? "",
    email: s?.email ?? "",
    phone: s?.phone ?? "",
    color: s?.color ?? "#c4942b",
    displayOrder: s?.displayOrder ?? 0,
    isActive: s?.isActive ?? true,
    showOnPublicSite: s?.showOnPublicSite ?? true,
    acceptsBookings: s?.acceptsBookings ?? true,
    serviceIds: s?.services.map((x) => x.serviceId) ?? [],
  };
}
