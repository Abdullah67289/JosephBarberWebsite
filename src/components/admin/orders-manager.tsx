"use client";

import * as React from "react";
import { Eye, Package } from "lucide-react";
import { updateOrder } from "@/server/order-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPageHeader } from "./admin-page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useAction } from "./use-action";
import { formatMoney } from "@/lib/money";

type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  fulfillmentType: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  totalCents: number;
  createdAt: string;
  internalNotes: string | null;
  items: { id: string; name: string; quantity: number; totalCents: number; variantLabel: string | null }[];
};

export function OrdersManager({ orders, currency }: { orders: Order[]; currency: string }) {
  return (
    <div>
      <AdminPageHeader title="Orders" description="Product orders placed through the shop." />
      {orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" description="Orders from the shop will appear here." />
      ) : (
        <div className="luxury-surface overflow-hidden rounded-xl">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/25 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Order</th>
                <th className="hidden p-4 font-medium md:table-cell">Customer</th>
                <th className="hidden p-4 font-medium sm:table-cell">Fulfillment</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Payment</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-secondary/40">
                  <td className="p-4">
                    <p className="font-mono font-medium text-primary">{o.reference}</p>
                    <p className="text-xs text-muted-foreground">{o.items.reduce((n, i) => n + i.quantity, 0)} items</p>
                  </td>
                  <td className="hidden p-4 md:table-cell">
                    <p>{o.customerName}</p>
                    <p className="text-xs text-muted-foreground">{o.customerEmail}</p>
                  </td>
                  <td className="hidden p-4 sm:table-cell">
                    <Badge variant="secondary">{o.fulfillmentType}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">{o.fulfillmentStatus}</span>
                  </td>
                  <td className="p-4 font-medium">{formatMoney(o.totalCents, currency)}</td>
                  <td className="p-4"><StatusBadge status={o.paymentStatus} /></td>
                  <td className="p-4 text-right">
                    <OrderDialog order={o} currency={currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OrderDialog({ order, currency }: { order: Order; currency: string }) {
  const { busy, run } = useAction();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(order.status);
  const [fulfillment, setFulfillment] = React.useState(order.fulfillmentStatus);
  const [payment, setPayment] = React.useState(order.paymentStatus);
  const [notes, setNotes] = React.useState(order.internalNotes ?? "");

  async function save() {
    const res = await run(() => updateOrder(order.id, { status, fulfillmentStatus: fulfillment, paymentStatus: payment, internalNotes: notes }), { success: "Order updated." });
    if (res.ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Order {order.reference}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <p className="font-medium">{order.customerName}</p>
          <p className="text-muted-foreground">{order.customerEmail} · {order.customerPhone}</p>
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-3">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between py-1 text-sm">
              <span>{i.quantity}× {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""}</span>
              <span>{formatMoney(i.totalCents, currency)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span><span>{formatMoney(order.totalCents, currency)}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Order status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["pending", "paid", "fulfilled", "cancelled", "refunded"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Fulfillment">
            <Select value={fulfillment} onValueChange={setFulfillment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["unfulfilled", "ready", "completed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Payment">
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["unpaid", "paid", "refunded"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Internal notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          <Button onClick={save} loading={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
