import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { OrdersManager } from "@/components/admin/orders-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  await requirePermission("manage_orders");
  const [orders, settings] = await Promise.all([
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { items: true } }),
    getSettings(),
  ]);

  return (
    <OrdersManager
      currency={settings.currency}
      orders={orders.map((o) => ({
        id: o.id,
        reference: o.reference,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        status: o.status,
        fulfillmentType: o.fulfillmentType,
        fulfillmentStatus: o.fulfillmentStatus,
        paymentStatus: o.paymentStatus,
        totalCents: o.totalCents,
        createdAt: o.createdAt.toISOString(),
        internalNotes: o.internalNotes,
        items: o.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, totalCents: i.totalCents, variantLabel: i.variantLabel })),
      }))}
    />
  );
}
