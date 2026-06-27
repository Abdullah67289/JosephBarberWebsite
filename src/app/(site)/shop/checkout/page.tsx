import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/site/page-header";
import { CheckoutForm } from "@/components/shop/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Checkout" title="Complete your order" />
      <section className="section">
        <div className="container max-w-5xl">
          <CheckoutForm taxRatePct={settings.taxRatePct} currency={settings.currency} />
        </div>
      </section>
    </>
  );
}
