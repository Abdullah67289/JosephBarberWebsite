import { CartDrawer } from "@/components/shop/cart-drawer";
import { CartProvider } from "@/components/shop/cart-context";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
