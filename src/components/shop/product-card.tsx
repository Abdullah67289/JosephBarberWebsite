"use client";

import * as React from "react";
import Image from "next/image";
import { ShoppingBag, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "./cart-context";
import { formatMoney, effectivePriceCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { shouldOptimizeImage } from "@/lib/image";

export interface ProductVariantData {
  id: string;
  name: string;
  value: string;
  priceDeltaCents: number;
  stock: number;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  salePriceCents?: number | null;
  imageUrl?: string | null;
  stock: number;
  trackInventory: boolean;
  lowStockThreshold: number;
  variants: ProductVariantData[];
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const cart = useCart();
  const [open, setOpen] = React.useState(false);
  const [variantId, setVariantId] = React.useState<string | null>(product.variants[0]?.id ?? null);
  const [added, setAdded] = React.useState(false);

  const base = effectivePriceCents(product.priceCents, product.salePriceCents);
  const onSale = product.salePriceCents != null && product.salePriceCents < product.priceCents;
  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = base + (variant?.priceDeltaCents ?? 0);
  const stock = variant ? variant.stock : product.stock;
  const soldOut = product.trackInventory && stock <= 0;
  const lowStock = product.trackInventory && !soldOut && stock <= product.lowStockThreshold;

  function addToCart() {
    if (soldOut) return;
    cart.add({
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      name: product.name,
      variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
      unitPriceCents: unitPrice,
      imageUrl: product.imageUrl,
      maxStock: product.trackInventory ? stock : null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
    setOpen(false);
  }

  return (
    <div className="premium-card group flex h-full min-h-[430px] flex-col">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="premium-image relative block aspect-square w-full overflow-hidden bg-secondary text-left">
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                unoptimized={!shouldOptimizeImage(product.imageUrl)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            )}
            <div className="absolute left-3 top-3 flex gap-1.5">
              {onSale && <Badge variant="danger">Sale</Badge>}
              {soldOut && <Badge variant="muted">Sold out</Badge>}
              {lowStock && <Badge variant="warning">Low stock</Badge>}
            </div>
          </button>
        </DialogTrigger>

        <DialogContent>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-lg border border-border bg-secondary">
              {product.imageUrl && (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={640}
                  height={640}
                  sizes="(max-width: 640px) 100vw, 50vw"
                  unoptimized={!shouldOptimizeImage(product.imageUrl)}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col">
              <DialogHeader>
                <DialogTitle>{product.name}</DialogTitle>
                <DialogDescription className="text-pretty">{product.description}</DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-2xl font-bold">{formatMoney(unitPrice)}</span>
                {onSale && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(product.priceCents + (variant?.priceDeltaCents ?? 0))}
                  </span>
                )}
              </div>

              {product.variants.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {product.variants[0]!.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariantId(v.id)}
                        disabled={product.trackInventory && v.stock <= 0}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:active:scale-100",
                          variantId === v.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        {v.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button className="mt-auto w-full" size="lg" onClick={addToCart} disabled={soldOut}>
                {soldOut ? "Sold out" : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to cart
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-1 flex-col p-4">
        <button onClick={() => setOpen(true)} className="text-left">
          <h3 className="font-medium leading-tight transition-colors group-hover:text-primary">{product.name}</h3>
        </button>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold">{formatMoney(unitPrice)}</span>
          {onSale && <span className="text-xs text-muted-foreground line-through">{formatMoney(product.priceCents)}</span>}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-auto"
          onClick={() => (product.variants.length > 0 ? setOpen(true) : addToCart())}
          disabled={soldOut}
        >
          {added ? <Check className="h-4 w-4 text-emerald-600" /> : <ShoppingBag className="h-4 w-4" />}
          {added ? "Added" : soldOut ? "Sold out" : product.variants.length > 0 ? "Choose options" : "Add to cart"}
        </Button>
      </div>
    </div>
  );
}
