"use client";

import * as React from "react";
import NextImage from "next/image";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { saveGalleryImage, deleteGalleryImage } from "@/server/content-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { MediaInput } from "./media-input";
import { NumberInput, ToggleRow } from "./inputs";
import { useAction } from "./use-action";
import { shouldOptimizeImage } from "@/lib/image";

type Image = {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  category: string | null;
  alt: string | null;
  displayOrder: number;
  isActive: boolean;
  isFeatured: boolean;
};

export function GalleryManager({ images }: { images: Image[] }) {
  return (
    <div>
      <AdminPageHeader
        title="Gallery"
        description="Showcase your work on the website and homepage."
        action={
          <ImageDialog>
            <Button>
              <Plus className="h-4 w-4" /> Add image
            </Button>
          </ImageDialog>
        }
      />
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No images yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((im) => (
            <div key={im.id} className="group relative overflow-hidden rounded-xl border border-border bg-secondary">
              <div className="relative aspect-square w-full">
                <NextImage
                  src={im.url}
                  alt={im.alt ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized={!shouldOptimizeImage(im.url)}
                  className="object-cover"
                />
              </div>
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {!im.isActive && <Badge variant="muted">Hidden</Badge>}
                {im.isFeatured && <Badge>Featured</Badge>}
              </div>
              <div className="absolute inset-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="min-w-0 truncate text-xs text-white">{im.title ?? im.caption ?? im.category ?? ""}</span>
                <span className="flex shrink-0 gap-1">
                  <ImageDialog image={im}>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </ImageDialog>
                  <ConfirmDelete
                    title="Delete image?"
                    onConfirm={() => deleteGalleryImage(im.id)}
                    success="Image removed."
                    trigger={
                      <Button variant="destructive" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageDialog({
  image,
  children,
}: {
  image?: Image;
  children: React.ReactNode;
}) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => init(image));

  React.useEffect(() => {
    if (open) setForm(init(image));
  }, [open, image]);

  const set = (k: keyof ReturnType<typeof init>, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const res = await run(() => saveGalleryImage({ id: image?.id, ...form }), {
      success: image ? "Image updated." : "Image added.",
    });
    if (res.ok) {
      setForm(init(undefined));
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{image ? "Edit gallery image" : "Add gallery image"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <MediaInput label="Image" value={form.url} onChange={(value) => set("url", value)} required />
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Caption">
              <Input value={form.caption} onChange={(e) => set("caption", e.target.value)} />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
            </Field>
          </div>
          <Field label="Alt text">
            <Input value={form.alt} onChange={(e) => set("alt", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 items-end gap-3">
            <Field label="Display order">
              <NumberInput value={form.displayOrder} onChange={(v) => set("displayOrder", v)} />
            </Field>
            <ToggleRow label="Active" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <ToggleRow label="Featured" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={save} loading={busy}>
            {image ? "Save image" : "Add image"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function init(image?: Image) {
  return {
    url: image?.url ?? "",
    title: image?.title ?? "",
    caption: image?.caption ?? "",
    category: image?.category ?? "",
    alt: image?.alt ?? "",
    displayOrder: image?.displayOrder ?? 0,
    isActive: image?.isActive ?? true,
    isFeatured: image?.isFeatured ?? false,
  };
}
