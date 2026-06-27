"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingBag, Store, Truck, Lock } from "lucide-react";
import { useCart } from "./cart-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { shouldOptimizeImage } from "@/lib/image";

export function CheckoutForm({ taxRatePct, currency }: { taxRatePct: number; currency: string }) {
  const cart = useCart();
  const router = useRouter();
  const [customer, setCustomer] = React.useState({ name: "", email: "", phone: "" });
  const [fulfillment, setFulfillment] = React.useState<"pickup" | "shipping">("pickup");
  const [address, setAddress] = React.useState({ line1: "", line2: "", city: "", region: "", postalCode: "", country: "Canada" });
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const subtotal = cart.subtotalCents;
  const tax = Math.round(subtotal * (taxRatePct / 100));
  const shipping = fulfillment === "shipping" ? 1200 : 0;
  const total = subtotal + tax + shipping;

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-card p-10 text-center">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold">Your cart is empty</h2>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? null, quantity: i.quantity })),
          customer,
          fulfillmentType: fulfillment,
          shippingAddress: fulfillment === "shipping" ? address : null,
          notes,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        if (j.fields) setErrors(j.fields);
        toast.error(j.error ?? "Could not place your order.");
        return;
      }
      cart.clear();
      if (j.data.provider === "stripe") {
        window.location.href = j.data.url;
      } else {
        router.push(`/shop/order/${j.data.reference}`);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Contact */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Contact details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors["customer.name"]}>
              <Input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} autoComplete="name" />
            </Field>
            <Field label="Phone" required error={errors["customer.phone"]}>
              <Input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} autoComplete="tel" />
            </Field>
            <Field label="Email" required error={errors["customer.email"]} className="sm:col-span-2">
              <Input type="email" value={customer.email} onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))} autoComplete="email" />
            </Field>
          </div>
        </section>

        {/* Fulfillment */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Fulfillment</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFulfillment("pickup")}
              className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99]", fulfillment === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}
            >
              <Store className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-medium">Store pickup</span>
                <span className="text-xs text-muted-foreground">Free · ready within 24h</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillment("shipping")}
              className={cn("flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99]", fulfillment === "shipping" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40")}
            >
              <Truck className="h-5 w-5 text-primary" />
              <span>
                <span className="block text-sm font-medium">Local shipping</span>
                <span className="text-xs text-muted-foreground">{formatMoney(1200, currency)} flat rate</span>
              </span>
            </button>
          </div>

          {fulfillment === "shipping" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Address" className="sm:col-span-2" required>
                <Input value={address.line1} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} placeholder="Street address" />
              </Field>
              <Field label="City" required>
                <Input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} />
              </Field>
              <Field label="Province" required>
                <Input value={address.region} onChange={(e) => setAddress((a) => ({ ...a, region: e.target.value }))} />
              </Field>
              <Field label="Postal code" required>
                <Input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} />
              </Field>
              <Field label="Country" required>
                <Input value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} />
              </Field>
            </div>
          )}

          <Field label="Order notes (optional)" className="mt-4">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything we should know?" />
          </Field>
        </section>
      </div>

      {/* Summary */}
      <aside className="h-fit space-y-4 rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold">Order summary</h2>
        <div className="space-y-3">
          {cart.items.map((i) => (
            <div key={`${i.productId}-${i.variantId ?? ""}`} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
                {i.imageUrl && (
                  <Image
                    src={i.imageUrl}
                    alt={i.name}
                    width={56}
                    height={56}
                    sizes="56px"
                    unoptimized={!shouldOptimizeImage(i.imageUrl)}
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {i.quantity}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium leading-tight">{i.name}</p>
                  {i.variantLabel && <p className="text-xs text-muted-foreground">{i.variantLabel}</p>}
                </div>
                <span className="text-sm">{formatMoney(i.unitPriceCents * i.quantity, currency)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="rule-fade" />
        <dl className="space-y-1.5 text-sm">
          <Line label="Subtotal" value={formatMoney(subtotal, currency)} />
          <Line label={`Tax (${taxRatePct}%)`} value={formatMoney(tax, currency)} />
          <Line label="Shipping" value={shipping ? formatMoney(shipping, currency) : "Free"} />
        </dl>
        <div className="rule-fade" />
        <div className="flex items-center justify-between">
          <span className="font-medium">Total</span>
          <span className="font-display text-xl font-bold">{formatMoney(total, currency)}</span>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          <Lock className="h-4 w-4" /> Place order
        </Button>
        <p className="text-center text-xs text-muted-foreground">Secure checkout. Pay in-store or online.</p>
      </aside>
    </form>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
