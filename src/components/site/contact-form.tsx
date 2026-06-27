"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

export function ContactForm() {
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        if (j.fields) setErrors(j.fields);
        toast.error(j.error ?? "Could not send your message.");
        return;
      }
      setSent(true);
      toast.success("Message sent — we'll be in touch soon!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-10 text-center animate-in fade-in zoom-in-95 duration-300 motion-reduce:animate-none">
        <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-600" />
        <h3 className="font-display text-xl font-semibold">Thanks for reaching out!</h3>
        <p className="mt-1 text-sm text-muted-foreground">We&apos;ve received your message and will reply shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={set("website")}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" required error={errors.name}>
          <Input id="c-name" value={form.name} onChange={set("name")} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="c-email" required error={errors.email}>
          <Input id="c-email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
        </Field>
        <Field label="Phone" htmlFor="c-phone" error={errors.phone}>
          <Input id="c-phone" value={form.phone} onChange={set("phone")} autoComplete="tel" />
        </Field>
        <Field label="Subject" htmlFor="c-subject" error={errors.subject}>
          <Input id="c-subject" value={form.subject} onChange={set("subject")} placeholder="How can we help?" />
        </Field>
      </div>
      <Field label="Message" htmlFor="c-message" required error={errors.message}>
        <Textarea id="c-message" rows={5} value={form.message} onChange={set("message")} />
      </Field>
      <Button type="submit" size="lg" loading={busy} className="w-full sm:w-auto">
        <Send className="h-4 w-4" /> Send message
      </Button>
    </form>
  );
}
