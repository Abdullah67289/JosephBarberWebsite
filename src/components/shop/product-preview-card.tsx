import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { ProductCardData } from "@/components/shop/product-card";
import { formatMoney, effectivePriceCents } from "@/lib/money";
import { shouldOptimizeImage } from "@/lib/image";

export function ProductPreviewCard({ product }: { product: ProductCardData }) {
  const price = effectivePriceCents(product.priceCents, product.salePriceCents);
  const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;

  return (
    <Link
      href="/shop"
      className="premium-card group flex h-full min-h-[390px] w-full flex-col"
    >
      <div className="premium-image relative aspect-square overflow-hidden bg-secondary">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={!shouldOptimizeImage(product.imageUrl)}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">{product.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-display text-lg font-bold">
            <span>{formatMoney(price)}</span>
            {onSale && <span className="text-xs text-muted-foreground line-through">{formatMoney(product.priceCents)}</span>}
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-border text-primary transition-colors group-hover:border-primary/50 group-hover:text-primary">
            <ShoppingBag className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
