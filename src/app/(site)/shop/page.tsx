import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getPageContent } from "@/lib/queries";
import { PageHeader } from "@/components/site/page-header";
import { ShopBrowser, type ShopProduct } from "@/components/shop/shop-browser";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Shop",
  description: "Premium grooming products hand-picked by our barbers — pomades, beard care, tools and more.",
};

export const revalidate = 300;

export default async function ShopPage() {
  const [page, products, categories] = await Promise.all([
    getPageContent("shop", {
      eyebrow: "The Shop",
      title: "Take the shop home",
      subtitle: "Barber-grade grooming products to keep you sharp between visits. Order online for in-store pickup.",
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { images: { orderBy: { displayOrder: "asc" } }, variants: true },
    }),
    db.productCategory.findMany({
      where: { isActive: true, products: { some: { isActive: true } } },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const shopProducts: ShopProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceCents: p.priceCents,
    salePriceCents: p.salePriceCents,
    imageUrl: p.images[0]?.url ?? null,
    stock: p.stock,
    trackInventory: p.trackInventory,
    lowStockThreshold: p.lowStockThreshold,
    categoryId: p.categoryId,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      priceDeltaCents: v.priceDeltaCents,
      stock: v.stock,
    })),
  }));

  return (
    <>
      <PageHeader eyebrow={page.eyebrow ?? "The Shop"} title={page.title} description={page.subtitle ?? undefined} />
      <section className="section section-build">
        <div className="container">
          {shopProducts.length === 0 ? (
            <EmptyState icon={PackageOpen} title="Shop coming soon" description="We're stocking the shelves. Check back shortly." />
          ) : (
            <ShopBrowser products={shopProducts} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
          )}
        </div>
      </section>
    </>
  );
}
