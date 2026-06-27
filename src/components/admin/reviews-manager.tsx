"use client";

import * as React from "react";
import { Plus, Pencil, Star } from "lucide-react";
import { saveTestimonial, deleteTestimonial } from "@/server/content-actions";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AdminPageHeader } from "./admin-page-header";
import { ConfirmDelete } from "./confirm-delete";
import { NumberInput, ToggleRow } from "./inputs";
import { useAction } from "./use-action";

type Review = {
  id: string;
  author: string;
  role: string | null;
  sourceLabel: string | null;
  rating: number;
  text: string;
  isApproved: boolean;
  isFeatured: boolean;
  displayOrder: number;
};

export function ReviewsManager({ reviews }: { reviews: Review[] }) {
  return (
    <div>
      <AdminPageHeader
        title="Reviews"
        description="Customer testimonials shown on the website."
        action={
          <ReviewDialog>
            <Button>
              <Plus className="h-4 w-4" /> New review
            </Button>
          </ReviewDialog>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />
                  ))}
                </div>
                <p className="mt-1 font-medium">
                  {r.author}
                  {r.role && <span className="text-sm text-muted-foreground"> - {r.role}</span>}
                  {r.sourceLabel && <span className="text-sm text-muted-foreground"> - {r.sourceLabel}</span>}
                </p>
              </div>
              <div className="flex gap-1">
                <ReviewDialog review={r}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </ReviewDialog>
                <ConfirmDelete title="Delete review?" onConfirm={() => deleteTestimonial(r.id)} success="Review deleted." />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">&quot;{r.text}&quot;</p>
            <div className="mt-3 flex gap-2">
              {r.isApproved ? <Badge variant="success">Approved</Badge> : <Badge variant="warning">Pending</Badge>}
              {r.isFeatured && <Badge>Featured</Badge>}
            </div>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No reviews yet.
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ review, children }: { review?: Review; children: React.ReactNode }) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(() => init(review));

  React.useEffect(() => {
    if (open) setForm(init(review));
  }, [open, review]);

  const set = (k: keyof ReturnType<typeof init>, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  async function save() {
    const res = await run(() => saveTestimonial({ id: review?.id, ...form }), {
      success: review ? "Review updated." : "Review added.",
    });
    if (res.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{review ? "Edit review" : "New review"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author" required>
              <Input value={form.author} onChange={(e) => set("author", e.target.value)} />
            </Field>
            <Field label="Role / context">
              <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Regular since 2010" />
            </Field>
          </div>
          <Field label="Source label">
            <Input value={form.sourceLabel} onChange={(e) => set("sourceLabel", e.target.value)} placeholder="Google review" />
          </Field>
          <Field label="Rating (1-5)">
            <NumberInput value={form.rating} onChange={(v) => set("rating", Math.min(5, Math.max(1, v)))} min={1} max={5} />
          </Field>
          <Field label="Review" required>
            <Textarea value={form.text} onChange={(e) => set("text", e.target.value)} rows={3} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow label="Approved" checked={form.isApproved} onChange={(v) => set("isApproved", v)} />
            <ToggleRow label="Featured" checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={save} loading={busy}>
            {review ? "Save" : "Add review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function init(r?: Review) {
  return {
    author: r?.author ?? "",
    role: r?.role ?? "",
    sourceLabel: r?.sourceLabel ?? "",
    rating: r?.rating ?? 5,
    text: r?.text ?? "",
    isApproved: r?.isApproved ?? true,
    isFeatured: r?.isFeatured ?? false,
    displayOrder: r?.displayOrder ?? 0,
  };
}
