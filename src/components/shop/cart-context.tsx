"use client";

import * as React from "react";

export interface CartItem {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  variantLabel?: string | null;
  unitPriceCents: number;
  imageUrl?: string | null;
  quantity: number;
  maxStock?: number | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: string, variantId?: string | null) => void;
  setQty: (productId: string, variantId: string | null | undefined, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  count: number;
  subtotalCents: number;
}

const CartContext = React.createContext<CartState | null>(null);
const STORAGE_KEY = "jm_cart_v1";

const sameLine = (a: CartItem, p: string, v?: string | null) =>
  a.productId === p && (a.variantId ?? null) === (v ?? null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const add: CartState["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => sameLine(p, item.productId, item.variantId));
      if (idx >= 0) {
        const next = [...prev];
        const cap = item.maxStock ?? Infinity;
        next[idx] = { ...next[idx]!, quantity: Math.min(next[idx]!.quantity + qty, cap) };
        return next;
      }
      return [...prev, { ...item, quantity: qty }];
    });
    setIsOpen(true);
  };

  const remove: CartState["remove"] = (productId, variantId) =>
    setItems((prev) => prev.filter((p) => !sameLine(p, productId, variantId)));

  const setQty: CartState["setQty"] = (productId, variantId, qty) =>
    setItems((prev) =>
      prev
        .map((p) => (sameLine(p, productId, variantId) ? { ...p, quantity: Math.max(0, qty) } : p))
        .filter((p) => p.quantity > 0),
    );

  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.quantity, 0);
  const subtotalCents = items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        add,
        remove,
        setQty,
        clear,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        count,
        subtotalCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
