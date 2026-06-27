"use client";

import * as React from "react";
import Image from "next/image";
import { Plus, Pencil, FolderCog, X, Trash2 } from "lucide-react";
import {
  saveProduct,
  deleteProduct,
  saveProductCategory,
  deleteProductCategory,
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
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { MediaInput } from "./media-input";
import { MoneyInput, NumberInput, ToggleRow } from "./inputs";
import { useAction } from "./use-action";
import { formatMoney } from "@/lib/money";
import { shouldOptimizeImage } from "@/lib/image";

type ImageRow = { url: string; alt?: string };
type VariantRow = { name: string; value: string; priceDeltaCents: number; stock: number; sku?: string | null };
type Product = {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  priceCents: number;
  salePriceCents: number | null;
  sku: string | null;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  images: { url: string; alt: string | null }[];
  variants: VariantRow[];
  category: { name: string } | null;
};
type Category = { id: string; name: string };

export function ProductsManager({ products, categories }: { products: Product[]; categories: Category[] }) {
  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Manage the products customers can buy in your shop."
        action={
          <div className="flex gap-2">
            <ProductCategoriesDialog categories={categories} />
            <ProductDialog categories={categories}>
              <Button><Plus className="h-4 w-4" /> New product</Button>
            </ProductDialog>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => {
          const low = p.trackInventory && p.stock <= p.lowStockThreshold;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="relative aspect-square bg-secondary">
                {p.images[0] && (
                  <Image
                    src={p.images[0].url}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized={!shouldOptimizeImage(p.images[0].url)}
                    className="object-cover"
                  />
                )}
                <div className="absolute left-2 top-2 flex gap-1">
                  {!p.isActive && <Badge variant="muted">Hidden</Badge>}
                  {p.isFeatured && <Badge>Featured</Badge>}
                  {low && <Badge variant="warning">Low: {p.stock}</Badge>}
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-display font-bold">{formatMoney(p.salePriceCents ?? p.priceCents)}</span>
                  {p.salePriceCents && <span className="text-xs text-muted-foreground line-through">{formatMoney(p.priceCents)}</span>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.trackInventory ? `${p.stock} in stock` : "Always available"}</span>
                  <div className="flex gap-1">
                    <ProductDialog categories={categories} product={p}>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                    </ProductDialog>
                    <ConfirmDelete title={`Delete "${p.name}"?`} onConfirm={() => deleteProduct(p.id)} success="Product deleted." trigger={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No products yet.</div>
        )}
      </div>
    </div>
  );
}

function ProductDialog({ categories, product, children }: { categories: Category[]; product?: Product; children: React.ReactNode }) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState(() => init(product));

  React.useEffect(() => {
    if (open) {
      setForm(init(product));
      setErrors({});
    }
  }, [open, product]);

  const set = (k: keyof ReturnType<typeof init>, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const res = await run(
      () =>
        saveProduct({
          id: product?.id,
          name: form.name,
          description: form.description,
          categoryId: form.categoryId === "none" ? null : form.categoryId,
          priceCents: form.priceCents,
          salePriceCents: form.salePriceCents || null,
          sku: form.sku || null,
          stock: form.stock,
          trackInventory: form.trackInventory,
          lowStockThreshold: form.lowStockThreshold,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          displayOrder: form.displayOrder,
          images: form.images.filter((i) => i.url.trim()),
          variants: form.variants.filter((v) => v.name.trim() && v.value.trim()),
        }),
      { success: product ? "Product updated." : "Product created." },
    );
    if (res.ok) setOpen(false);
    else if (res.fieldErrors) setErrors(res.fieldErrors);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>Set pricing, inventory, images and options.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name} className="sm:col-span-2"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
          <Field label="Category">
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="SKU"><Input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
          <Field label="Price" required error={errors.priceCents}><MoneyInput cents={form.priceCents} onChange={(v) => set("priceCents", v)} /></Field>
          <Field label="Sale price (optional)"><MoneyInput cents={form.salePriceCents} onChange={(v) => set("salePriceCents", v)} /></Field>
          <Field label="Stock"><NumberInput value={form.stock} onChange={(v) => set("stock", v)} /></Field>
          <Field label="Low-stock alert at"><NumberInput value={form.lowStockThreshold} onChange={(v) => set("lowStockThreshold", v)} /></Field>
          <Field label="Display order"><NumberInput value={form.displayOrder} onChange={(v) => set("displayOrder", v)} /></Field>

          {/* Images */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Images</p>
            <div className="space-y-2">
              {form.images.map((im, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto]">
                  <MediaInput
                    label={`Image ${i + 1}`}
                    value={im.url}
                    onChange={(value) => set("images", form.images.map((x, j) => (j === i ? { ...x, url: value } : x)))}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => set("images", form.images.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  <Field label="Alt text" className="sm:col-span-2">
                    <Input value={im.alt ?? ""} onChange={(e) => set("images", form.images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                  </Field>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => set("images", [...form.images, { url: "", alt: "" }])}><Plus className="h-4 w-4" /> Add image</Button>
            </div>
          </div>

          {/* Variants */}
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium">Variants (size, scent, etc.)</p>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-2">
                  <Input value={v.name} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Name (Size)" />
                  <Input value={v.value} onChange={(e) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder="Value (200ml)" />
                  <div className="w-24"><MoneyInput cents={v.priceDeltaCents} onChange={(c) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, priceDeltaCents: c } : x)))} placeholder="+$" /></div>
                  <div className="w-16"><NumberInput value={v.stock} onChange={(n) => set("variants", form.variants.map((x, j) => (j === i ? { ...x, stock: n } : x)))} /></div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => set("variants", form.variants.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => set("variants", [...form.variants, { name: "", value: "", priceDeltaCents: 0, stock: 0 }])}><Plus className="h-4 w-4" /> Add variant</Button>
            </div>
          </div>

          <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">
            <ToggleRow label="Active" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <ToggleRow label="Featured" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
            <ToggleRow label="Track stock" checked={form.trackInventory} onChange={(v) => set("trackInventory", v)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={save} loading={busy}>{product ? "Save changes" : "Create product"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function init(p?: Product) {
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    categoryId: p?.categoryId ?? "none",
    priceCents: p?.priceCents ?? 0,
    salePriceCents: p?.salePriceCents ?? 0,
    sku: p?.sku ?? "",
    stock: p?.stock ?? 0,
    trackInventory: p?.trackInventory ?? true,
    lowStockThreshold: p?.lowStockThreshold ?? 3,
    isActive: p?.isActive ?? true,
    isFeatured: p?.isFeatured ?? false,
    displayOrder: p?.displayOrder ?? 0,
    images: (p?.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "" })) as ImageRow[],
    variants: (p?.variants ?? []).map((v) => ({ name: v.name, value: v.value, priceDeltaCents: v.priceDeltaCents, stock: v.stock })) as VariantRow[],
  };
}

function ProductCategoriesDialog({ categories }: { categories: Category[] }) {
  const { busy, run } = useAction();
  const [name, setName] = React.useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline"><FolderCog className="h-4 w-4" /> Categories</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Product categories</DialogTitle>
          <DialogDescription>Used to filter the shop.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              {c.name}
              <ConfirmDelete title={`Delete "${c.name}"?`} onConfirm={() => deleteProductCategory(c.id)} success="Deleted." />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Field label="New category" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Button loading={busy} onClick={async () => { const r = await run(() => saveProductCategory({ name }), { success: "Category added." }); if (r.ok) setName(""); }}>Add</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
