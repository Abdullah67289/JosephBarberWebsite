import { type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { notifyOrderConfirmation } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripe = await getStripe();
  if (!stripe || !env.stripe.webhookSecret) {
    return new Response("Stripe not configured", { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    // Async variant uses WebCrypto — required on Cloudflare Workers, works on Node.
    event = await stripe.webhooks.constructEventAsync(body, sig ?? "", env.stripe.webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: { orderId?: string } };
    const orderId = session.metadata?.orderId;
    if (orderId) {
      const order = await db.order.update({
        where: { id: orderId },
        data: { status: "paid", paymentStatus: "paid" },
        include: { items: true },
      });
      void notifyOrderConfirmation({
        id: order.id,
        reference: order.reference,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        totalCents: order.totalCents,
        fulfillmentType: order.fulfillmentType,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, totalCents: i.totalCents, variantLabel: i.variantLabel })),
      });
    }
  }

  return new Response("ok", { status: 200 });
}
