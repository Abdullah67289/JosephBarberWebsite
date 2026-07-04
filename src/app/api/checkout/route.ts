import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { checkoutSchema } from "@/lib/validation";
import { db, usingD1 } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { effectivePriceCents } from "@/lib/money";
import { generateOrderReference } from "@/lib/tokens";
import { createCheckoutSession } from "@/lib/stripe";
import { notifyOrderConfirmation } from "@/lib/notifications";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const SHIPPING_FLAT_CENTS = 1200;

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    if (!rateLimit(`checkout:${ip}`, 10, 60_000).success) {
      return fail("Too many requests. Please wait a moment.", 429);
    }

    const input = checkoutSchema.parse(await req.json());
    const settings = await getSettings();

    // Resolve products + variants server-side — never trust client prices.
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: true, images: { orderBy: { displayOrder: "asc" }, take: 1 } },
    });

    const lines: {
      productId: string;
      variantId: string | null;
      name: string;
      variantLabel: string | null;
      unitPriceCents: number;
      quantity: number;
      totalCents: number;
      imageUrl: string | null;
    }[] = [];

    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return fail("One of the items is no longer available.", 409);

      let unit = effectivePriceCents(product.priceCents, product.salePriceCents);
      let variantLabel: string | null = null;
      let available = product.stock;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) return fail(`A selected option for ${product.name} is unavailable.`, 409);
        unit += variant.priceDeltaCents;
        variantLabel = `${variant.name}: ${variant.value}`;
        available = variant.stock;
      }

      if (product.trackInventory && item.quantity > available) {
        return fail(`Only ${available} of ${product.name} left in stock.`, 409);
      }

      lines.push({
        productId: product.id,
        variantId: item.variantId ?? null,
        name: product.name,
        variantLabel,
        unitPriceCents: unit,
        quantity: item.quantity,
        totalCents: unit * item.quantity,
        imageUrl: product.images[0]?.url ?? null,
      });
    }

    if (lines.length === 0) return fail("Your cart is empty.", 400);

    const subtotalCents = lines.reduce((s, l) => s + l.totalCents, 0);
    const taxCents = Math.round(subtotalCents * (settings.taxRatePct / 100));
    const shippingCents = input.fulfillmentType === "shipping" ? SHIPPING_FLAT_CENTS : 0;
    const totalCents = subtotalCents + taxCents + shippingCents;
    const reference = generateOrderReference();

    // Reserve stock + create the order atomically. On Cloudflare D1 there are
    // no interactive transactions, so the steps run sequentially — the
    // conditional stock decrements (stock >= qty guards) remain the real
    // oversell protection either way.
    const createOrder = async (tx: Prisma.TransactionClient) => {
        for (const line of lines) {
          const product = products.find((p) => p.id === line.productId)!;
          if (!product.trackInventory) continue;
          if (line.variantId) {
            const res = await tx.productVariant.updateMany({
              where: { id: line.variantId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (res.count === 0) throw new StockError(line.name);
          } else {
            const res = await tx.product.updateMany({
              where: { id: line.productId, stock: { gte: line.quantity } },
              data: { stock: { decrement: line.quantity } },
            });
            if (res.count === 0) throw new StockError(line.name);
          }
        }

        const customer = await tx.customer.upsert({
          where: { email: input.customer.email },
          update: { name: input.customer.name, phone: input.customer.phone },
          create: { name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
        });

        return tx.order.create({
          data: {
            reference,
            customerId: customer.id,
            customerName: input.customer.name,
            customerEmail: input.customer.email,
            customerPhone: input.customer.phone,
            fulfillmentType: input.fulfillmentType,
            shippingAddress: input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
            notes: input.notes || null,
            subtotalCents,
            taxCents,
            shippingCents,
            totalCents,
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                name: l.name,
                variantLabel: l.variantLabel,
                unitPriceCents: l.unitPriceCents,
                quantity: l.quantity,
                totalCents: l.totalCents,
              })),
            },
          },
          include: { items: true },
        });
    };
    const order = usingD1()
      ? await createOrder(db)
      : await db.$transaction(createOrder, { isolationLevel: "Serializable" });

    const successUrl = `${env.siteUrl}/shop/order/${reference}`;
    const checkout = await createCheckoutSession({
      lines: [
        ...lines.map((l) => ({ name: l.name, description: l.variantLabel ?? undefined, amountCents: l.unitPriceCents, quantity: l.quantity })),
        ...(taxCents > 0 ? [{ name: "Tax (HST)", amountCents: taxCents, quantity: 1 }] : []),
        ...(shippingCents > 0 ? [{ name: "Shipping", amountCents: shippingCents, quantity: 1 }] : []),
      ],
      customerEmail: input.customer.email,
      successUrl: `${successUrl}?paid=1`,
      cancelUrl: `${env.siteUrl}/shop/checkout`,
      currency: settings.currency,
      metadata: { orderId: order.id, reference },
    });

    if (checkout.provider === "mock") {
      // Offline mode: mark paid immediately and confirm.
      await db.order.update({
        where: { id: order.id },
        data: { status: "paid", paymentStatus: "paid", paymentProvider: "mock" },
      });
      void notifyOrderConfirmation({
        id: order.id,
        reference,
        customerName: input.customer.name,
        customerEmail: input.customer.email,
        customerPhone: input.customer.phone,
        totalCents,
        fulfillmentType: input.fulfillmentType,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, totalCents: i.totalCents, variantLabel: i.variantLabel })),
      });
    } else {
      await db.order.update({
        where: { id: order.id },
        data: { paymentProvider: "stripe", stripeSessionId: checkout.sessionId },
      });
    }

    return ok({ url: checkout.url, reference, provider: checkout.provider });
  } catch (err) {
    if (err instanceof StockError) return fail(`Sorry, ${err.productName} just sold out. Please adjust your cart.`, 409);
    return handleError(err);
  }
}

class StockError extends Error {
  productName: string;
  constructor(productName: string) {
    super("Out of stock");
    this.productName = productName;
  }
}
