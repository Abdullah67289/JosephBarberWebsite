"use client";

import { FlowingMenu, type FlowingMenuItem } from "@/components/animations/FlowingMenu";

const BARBER_MENU_ITEMS: FlowingMenuItem[] = [
  {
    text: "Classic Cuts",
    link: "/services",
    image: "https://images.unsplash.com/photo-1622288432450-277d0fef5ed6?auto=format&fit=crop&w=900&q=82",
  },
  {
    text: "Skin Fades",
    link: "/book",
    image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=82",
  },
  {
    text: "Beard Rituals",
    link: "/services",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=82",
  },
  {
    text: "Hot Towels",
    link: "/book",
    image: "https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=900&q=82",
  },
];

export function FlowingMenuFeature() {
  return (
    <section id="chair-menu" className="relative overflow-hidden border-y border-primary/15 bg-background">
      <div className="barber-galaxy opacity-25" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="container relative grid gap-8 py-16 lg:grid-cols-[0.72fr_1.28fr] lg:items-stretch lg:py-20">
        <div className="flex flex-col justify-center">
          <span className="eyebrow mb-4">The chair menu</span>
          <h2 className="text-balance font-display text-3xl font-bold md:text-5xl">
            Pick the craft, then take the chair.
          </h2>
          <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            A moving little snapshot of the shop rhythm: scissors, towels, fades, and finishing details. Tap a row to
            jump into the service menu or booking flow.
          </p>
        </div>
        <div className="relative min-h-[380px] overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-[0_28px_80px_-48px_hsl(var(--primary)/0.75)]">
          <FlowingMenu
            items={BARBER_MENU_ITEMS}
            speed={16}
            textColor="hsl(var(--foreground))"
            bgColor="hsl(var(--card))"
            marqueeBgColor="#f7ead0"
            marqueeTextColor="#100d08"
            borderColor="hsl(var(--primary) / 0.24)"
          />
        </div>
      </div>
    </section>
  );
}
