import { env } from "./env";

/**
 * Stripe integration with a graceful MOCK mode. When STRIPE_SECRET_KEY is
 * absent, checkout returns `{ provider: "mock" }` and the caller marks the
 * order paid immediately — so the full purchase flow is testable offline.
 */

export interface CheckoutLine {
  name: string;
  description?: string;
  amountCents: number; // unit amount
  quantity: number;
}

export interface CheckoutResult {
  provider: "stripe" | "mock";
  url: string;
  sessionId?: string;
}

export async function createCheckoutSession(opts: {
  lines: CheckoutLine[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  currency: string;
  metadata: Record<string, string>;
}): Promise<CheckoutResult> {
  if (!env.stripe.isConfigured) {
    return { provider: "mock", url: opts.successUrl };
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(env.stripe.secretKey);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.customerEmail,
    line_items: opts.lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: opts.currency.toLowerCase(),
        unit_amount: l.amountCents,
        product_data: { name: l.name, description: l.description },
      },
    })),
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: opts.metadata,
  });

  return { provider: "stripe", url: session.url ?? opts.successUrl, sessionId: session.id };
}

export async function getStripe() {
  if (!env.stripe.isConfigured) return null;
  const Stripe = (await import("stripe")).default;
  return new Stripe(env.stripe.secretKey);
}
