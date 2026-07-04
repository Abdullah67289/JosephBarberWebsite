import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductsManager } from "@/components/admin/products-manager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requirePermission("manage_shop");
  const [products, categories] = await Promise.all([
    db.product.findMany({
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      take: 120,
      include: { category: true, images: { orderBy: { displayOrder: "asc" } }, variants: true },
    }),
    db.productCategory.findMany({ orderBy: { displayOrder: "asc" }, take: 60 }),
  ]);
  return <ProductsManager products={products} categories={categories} />;
}
