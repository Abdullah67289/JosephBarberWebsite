import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Store, Truck, Package } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Order Confirmation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { reference: ref }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const paid = order.paymentStatus === "paid";

  return (
    <>
      <PageHeader eyebrow="Thank you" title="Order confirmed" />
      <section className="section">
        <div className="container max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-600" />
              <h2 className="font-display text-2xl font-bold">Thanks, {order.customerName.split(" ")[0]}!</h2>
              <p className="mt-1 text-muted-foreground">
                {paid ? "Your payment was received." : "Your order has been placed."} A confirmation is on its way to {order.customerEmail}.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-background/40 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Order reference</p>
                <p className="font-mono text-lg font-bold text-primary">{order.reference}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              {order.fulfillmentType === "pickup" ? <Store className="h-4 w-4 text-primary" /> : <Truck className="h-4 w-4 text-primary" />}
              {order.fulfillmentType === "pickup"
                ? `Pickup at ${settings.address}, ${settings.city} — we'll text you when it's ready.`
                : "Shipping to the address you provided."}
            </div>

            <div className="mt-6 space-y-3">
              {order.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {i.quantity}× {i.name}
                    {i.variantLabel && <span className="text-muted-foreground">({i.variantLabel})</span>}
                  </span>
                  <span>{formatMoney(i.totalCents, settings.currency)}</span>
                </div>
              ))}
            </div>

            <div className="rule-fade my-5" />
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatMoney(order.subtotalCents, settings.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd>{formatMoney(order.taxCents, settings.currency)}</dd></div>
              {order.shippingCents > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd>{formatMoney(order.shippingCents, settings.currency)}</dd></div>}
            </dl>
            <div className="rule-fade my-5" />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="font-display text-xl font-bold">{formatMoney(order.totalCents, settings.currency)}</span>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/shop">Continue shopping</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
