"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "./cart-context";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { shouldOptimizeImage } from "@/lib/image";

export function CartDrawer() {
  const cart = useCart();
  if (!cart.isOpen) return null;

  return (
    <>
      <div onClick={cart.close} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-card-hover animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Your Cart ({cart.count})
              </h2>
              <button onClick={cart.close} className="rounded-md p-1.5 hover:bg-secondary" aria-label="Close cart">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cart.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Your cart is empty.</p>
                <Button asChild variant="outline" onClick={cart.close}>
                  <Link href="/shop">Browse products</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {cart.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId ?? ""}`}
                      className="flex gap-3 animate-fade-up"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-secondary">
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={80}
                            height={80}
                            sizes="80px"
                            unoptimized={!shouldOptimizeImage(item.imageUrl)}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium leading-tight">{item.name}</p>
                            {item.variantLabel && (
                              <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                            )}
                          </div>
                          <button
                            onClick={() => cart.remove(item.productId, item.variantId)}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-md border border-border">
                            <button
                              onClick={() => cart.setQty(item.productId, item.variantId, item.quantity - 1)}
                              className="grid h-8 w-8 place-items-center transition-all duration-200 hover:bg-secondary active:scale-90"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => cart.setQty(item.productId, item.variantId, item.quantity + 1)}
                              className="grid h-8 w-8 place-items-center transition-all duration-200 hover:bg-secondary active:scale-90"
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatMoney(item.unitPriceCents * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 border-t border-border p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display text-lg font-bold">{formatMoney(cart.subtotalCents)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Taxes calculated at checkout · Pickup in-store</p>
                  <Button asChild size="lg" className="w-full" onClick={cart.close}>
                    <Link href="/shop/checkout">Checkout</Link>
                  </Button>
                </div>
              </>
            )}
      </aside>
    </>
  );
}

export function CartButton() {
  const cart = useCart();
  return (
    <button
      onClick={cart.open}
      className="relative grid h-10 w-10 place-items-center rounded-md border border-border transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50"
      aria-label="Open cart"
    >
      <ShoppingBag className="h-[18px] w-[18px]" />
      {cart.count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in duration-150">
          {cart.count}
        </span>
      )}
    </button>
  );
}
