"use client";

import * as React from "react";
import { Plus, Pencil, Clock, FolderCog, GripVertical } from "lucide-react";
import {
  saveService,
  deleteService,
  saveServiceCategory,
  deleteServiceCategory,
  saveServiceAddon,
  deleteServiceAddon,
} from "@/server/catalog-actions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceIcon } from "@/components/site/service-icon";
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { MediaInput } from "./media-input";
import { MoneyInput, NumberInput, ToggleRow, Chip } from "./inputs";
import { useAction } from "./use-action";
import { formatMoney } from "@/lib/money";

const ICONS = ["scissors", "wind", "droplet", "sparkles", "baby", "user", "ruler", "brush"];

type Addon = { id: string; name: string; priceCents: number; durationMin: number };
type Service = {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  priceCents: number;
  depositCents: number;
  icon: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  showOnServicesPage: boolean;
  isBookable: boolean;
  isFeatured: boolean;
  staff: { staffId: string }[];
  addons: Addon[];
  category: { name: string } | null;
};
type Category = { id: string; name: string };
type StaffLite = { id: string; name: string };

export function ServicesManager({
  services,
  categories,
  staff,
}: {
  services: Service[];
  categories: Category[];
  staff: StaffLite[];
}) {
  return (
    <div>
      <AdminPageHeader
        title="Services"
        description="Create and manage the services customers can book."
        action={
          <div className="flex gap-2">
            <CategoriesDialog categories={categories} />
            <ServiceDialog categories={categories} staff={staff}>
              <Button>
                <Plus className="h-4 w-4" /> New service
              </Button>
            </ServiceDialog>
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-4 font-medium">Service</th>
              <th className="hidden p-4 font-medium md:table-cell">Category</th>
              <th className="hidden p-4 font-medium sm:table-cell">Duration</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {services.map((s) => (
              <tr key={s.id} className="hover:bg-secondary/40">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ServiceIcon name={s.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden p-4 text-muted-foreground md:table-cell">{s.category?.name ?? "—"}</td>
                <td className="hidden p-4 text-muted-foreground sm:table-cell">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {s.durationMin}m
                  </span>
                </td>
                <td className="p-4 font-medium">{formatMoney(s.priceCents)}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {s.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}
                    {s.showOnServicesPage && <Badge>Public</Badge>}
                    {s.isBookable ? <Badge variant="success">Bookable</Badge> : <Badge variant="warning">Not bookable</Badge>}
                    {s.isFeatured && <Badge>Featured</Badge>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-1">
                    <ServiceDialog categories={categories} staff={staff} service={s}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ServiceDialog>
                    <ConfirmDelete
                      title={`Delete "${s.name}"?`}
                      description="Existing bookings keep their record, but the service will no longer be bookable."
                      onConfirm={() => deleteService(s.id)}
                      success="Service deleted."
                    />
                  </div>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  No services yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- service dialog

function ServiceDialog({
  categories,
  staff,
  service,
  children,
}: {
  categories: Category[];
  staff: StaffLite[];
  service?: Service;
  children: React.ReactNode;
}) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(() => initForm(service));
  const [addons, setAddons] = React.useState<Addon[]>(service?.addons ?? []);

  React.useEffect(() => {
    if (open) {
      setForm(initForm(service));
      setAddons(service?.addons ?? []);
      setErrors({});
    }
  }, [open, service]);

  const set = (k: keyof ReturnType<typeof initForm>, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const res = await run(
      () =>
        saveService({
          id: service?.id,
          name: form.name,
          description: form.description,
          categoryId: form.categoryId === "none" ? null : form.categoryId,
          durationMin: form.durationMin,
          bufferBeforeMin: form.bufferBeforeMin,
          bufferAfterMin: form.bufferAfterMin,
          priceCents: form.priceCents,
          depositCents: form.depositCents,
          icon: form.icon,
          imageUrl: form.imageUrl || null,
          displayOrder: form.displayOrder,
          isActive: form.isActive,
          showOnServicesPage: form.showOnServicesPage,
          isBookable: form.isBookable,
          isFeatured: form.isFeatured,
          staffIds: form.staffIds,
        }),
      { success: service ? "Service updated." : "Service created." },
    );
    if (res.ok) setOpen(false);
    else if (res.fieldErrors) setErrors(res.fieldErrors);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{service ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>Configure how this service is booked.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name} className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Description" error={errors.description} className="sm:col-span-2">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </Field>
          <Field label="Category">
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Icon">
            <Select value={form.icon} onValueChange={(v) => set("icon", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICONS.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration (min)" required error={errors.durationMin}>
            <NumberInput value={form.durationMin} onChange={(v) => set("durationMin", v)} min={5} max={600} />
          </Field>
          <Field label="Price" required error={errors.priceCents}>
            <MoneyInput cents={form.priceCents} onChange={(v) => set("priceCents", v)} />
          </Field>
          <Field label="Buffer before (min)" hint="Spacing before appt">
            <NumberInput value={form.bufferBeforeMin} onChange={(v) => set("bufferBeforeMin", v)} />
          </Field>
          <Field label="Buffer after (min)" hint="Cleanup / reset time">
            <NumberInput value={form.bufferAfterMin} onChange={(v) => set("bufferAfterMin", v)} />
          </Field>
          <Field label="Deposit (optional)">
            <MoneyInput cents={form.depositCents} onChange={(v) => set("depositCents", v)} />
          </Field>
          <Field label="Display order">
            <NumberInput value={form.displayOrder} onChange={(v) => set("displayOrder", v)} />
          </Field>
          <MediaInput
            label="Image"
            value={form.imageUrl}
            onChange={(value) => set("imageUrl", value)}
            className="sm:col-span-2"
          />

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Barbers offering this service</p>
            <div className="flex flex-wrap gap-2">
              {staff.map((st) => (
                <Chip
                  key={st.id}
                  active={form.staffIds.includes(st.id)}
                  onClick={() =>
                    set(
                      "staffIds",
                      form.staffIds.includes(st.id) ? form.staffIds.filter((x) => x !== st.id) : [...form.staffIds, st.id],
                    )
                  }
                >
                  {st.name}
                </Chip>
              ))}
              {staff.length === 0 && <p className="text-sm text-muted-foreground">Add staff first.</p>}
            </div>
          </div>

          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
            <ToggleRow label="Active" description="Available for public use" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <ToggleRow label="Show on Services page" description="Display on the public menu" checked={form.showOnServicesPage} onChange={(v) => set("showOnServicesPage", v)} />
            <ToggleRow label="Bookable online" description="Appears in the booking flow" checked={form.isBookable} onChange={(v) => set("isBookable", v)} />
            <ToggleRow label="Featured" description="Eligible for homepage highlights" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
          </div>

          {service && (
            <div className="sm:col-span-2">
              <AddonEditor serviceId={service.id} addons={addons} setAddons={setAddons} />
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={save} loading={busy}>
            {service ? "Save changes" : "Create service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initForm(s?: Service) {
  return {
    name: s?.name ?? "",
    description: s?.description ?? "",
    categoryId: s?.categoryId ?? "none",
    durationMin: s?.durationMin ?? 30,
    bufferBeforeMin: s?.bufferBeforeMin ?? 0,
    bufferAfterMin: s?.bufferAfterMin ?? 5,
    priceCents: s?.priceCents ?? 0,
    depositCents: s?.depositCents ?? 0,
    icon: s?.icon ?? "scissors",
    imageUrl: s?.imageUrl ?? "",
    displayOrder: s?.displayOrder ?? 0,
    isActive: s?.isActive ?? true,
    showOnServicesPage: s?.showOnServicesPage ?? true,
    isBookable: s?.isBookable ?? true,
    isFeatured: s?.isFeatured ?? false,
    staffIds: s?.staff.map((x) => x.staffId) ?? [],
  };
}

// ----------------------------------------------------------------- add-ons

function AddonEditor({
  serviceId,
  addons,
  setAddons,
}: {
  serviceId: string;
  addons: Addon[];
  setAddons: React.Dispatch<React.SetStateAction<Addon[]>>;
}) {
  const { busy, run } = useAction();
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  async function add() {
    if (!name.trim()) return;
    const res = await run(() => saveServiceAddon({ serviceId, name, priceCents: price, durationMin: duration }), {
      success: "Add-on added.",
    });
    if (res.ok) {
      setAddons((prev) => [...prev, { id: `tmp-${Date.now()}`, name, priceCents: price, durationMin: duration }]);
      setName("");
      setPrice(0);
      setDuration(0);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <p className="mb-2 text-sm font-medium">Add-ons / upgrades</p>
      <div className="space-y-2">
        {addons.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
            <span>{a.name}</span>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{formatMoney(a.priceCents)}</span>
              <span>{a.durationMin}m</span>
              {!a.id.startsWith("tmp-") && (
                <ConfirmDelete
                  title="Remove add-on?"
                  onConfirm={() => deleteServiceAddon(a.id)}
                  success="Add-on removed."
                  trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400"><span className="text-lg leading-none">×</span></Button>}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hot towel finish" /></Field>
        <Field label="Price"><MoneyInput cents={price} onChange={setPrice} /></Field>
        <Field label="+min"><NumberInput value={duration} onChange={setDuration} className="w-16" /></Field>
        <Button type="button" variant="secondary" onClick={add} loading={busy}>Add</Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- categories

function CategoriesDialog({ categories }: { categories: Category[] }) {
  const { busy, run } = useAction();
  const [name, setName] = React.useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderCog className="h-4 w-4" /> Categories
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Service categories</DialogTitle>
          <DialogDescription>Group services on the website.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="flex items-center gap-2 text-sm"><GripVertical className="h-4 w-4 text-muted-foreground" />{c.name}</span>
              <ConfirmDelete title={`Delete "${c.name}"?`} onConfirm={() => deleteServiceCategory(c.id)} success="Category deleted." />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Field label="New category" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haircuts" /></Field>
          <Button onClick={async () => { const r = await run(() => saveServiceCategory({ name }), { success: "Category added." }); if (r.ok) setName(""); }} loading={busy}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
