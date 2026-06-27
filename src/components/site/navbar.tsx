"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Phone, CalendarCheck, LogIn, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BrandMark } from "@/components/site/brand-mark";
import { ScissorsNav } from "./scissors-nav";
import { cn } from "@/lib/utils";

export type NavLink = {
  href: string;
  label: string;
  openInNewTab?: boolean;
};

export function Navbar({
  businessName,
  phone,
  links,
  bookText,
  bookHref,
  showCartButton,
}: {
  businessName: string;
  phone: string;
  logoUrl?: string | null;
  links: NavLink[];
  bookText: string;
  bookHref: string;
  showCartButton: boolean;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // `closing` lets the menu play a CSS exit animation before it unmounts.
  const [closing, setClosing] = useState(false);
  // Portal target only exists on the client; render the overlay after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const closeMenu = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 240);
  };
  const toggleMenu = () => (open ? closeMenu() : setOpen(true));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="header-reveal fixed inset-x-0 top-0 z-40">
      {/* Frosted bar that cross-fades in on scroll. Kept on its own opacity
          layer so the background, blur and border ease in smoothly instead of
          popping (you can't transition between a gradient and a solid color). */}
      <div
        className={cn(
          "nav-scroll-layer pointer-events-none absolute inset-0 border-b border-primary/15 bg-background/85 backdrop-blur-xl",
          scrolled ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      </div>
      {/* Soft top veil at the very top of the page (fades out as the bar fades in). */}
      <div
        className={cn(
          "nav-scroll-layer pointer-events-none absolute inset-0 bg-gradient-to-b from-background/55 to-transparent",
          scrolled ? "opacity-0" : "opacity-100",
        )}
        aria-hidden
      />
      <nav className="container relative flex h-16 items-center justify-between gap-4 md:h-20 lg:h-[172px]">
        {/* Brand */}
        <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={businessName}>
          <BrandMark />
          <span className="hidden truncate font-display text-lg font-bold leading-tight tracking-tight sm:block">
            {businessName}
          </span>
        </Link>

        {/* Scissors navbar (desktop) */}
        <ScissorsNav links={links} isActive={isActive} />

        {/* Handle-ring actions */}
        <div className="flex items-center gap-2.5">
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
            className="hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground xl:inline-flex"
          >
            <Phone className="h-4 w-4 text-primary" />
            {phone}
          </a>
          <ThemeToggle className="hidden lg:inline-flex" />
          <Link href="/admin/login" className="handle-ring hidden lg:grid" title="Staff Login" aria-label="Staff Login">
            <LogIn className="h-[18px] w-[18px]" />
          </Link>
          {showCartButton && (
            <Link href="/shop" className="handle-ring" aria-label="Shop products">
              <ShoppingBag className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={bookHref}>
              <CalendarCheck className="h-4 w-4" />
              {bookText}
            </Link>
          </Button>
          <button
            className="group/hamburger grid h-10 w-10 place-items-center rounded-full border border-primary/40 bg-card/40 transition-colors hover:border-primary/70 focus-visible:border-primary/70 lg:hidden"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={open}
            data-state={open && !closing ? "open" : "closed"}
          >
            <span className="relative flex size-4 flex-col items-center justify-center">
              <span className="absolute h-0.5 w-4 -translate-y-1.5 rounded-full bg-current transition-transform duration-200 group-data-[state=open]/hamburger:translate-y-0 group-data-[state=open]/hamburger:rotate-45" />
              <span className="absolute h-0.5 w-4 rounded-full bg-current transition-opacity duration-200 group-data-[state=open]/hamburger:opacity-0" />
              <span className="absolute h-0.5 w-4 translate-y-1.5 rounded-full bg-current transition-transform duration-200 group-data-[state=open]/hamburger:translate-y-0 group-data-[state=open]/hamburger:-rotate-45" />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu — rendered in a portal on <body> so it is never trapped by
          the fixed header's containing block (the header gains backdrop-filter +
          a transform on scroll, which would otherwise collapse a fixed child to
          the header's height and break the full-screen overlay). */}
      {mounted && open &&
        createPortal(
          <div
            data-state={closing ? "closing" : "open"}
            className="mobile-menu-panel theme-cream fixed inset-0 top-16 z-30 text-foreground lg:hidden"
          >
            {/* Frosted glass: a warm cream tint over a heavy backdrop blur so the
                hero behind reads as a soft, premium wash — no sharp text bleeds
                through, on any background. */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl" aria-hidden />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" aria-hidden />
            <div className="relative container flex h-[calc(100svh-4rem)] flex-col gap-1 overflow-y-auto overscroll-contain py-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.openInNewTab ? "_blank" : undefined}
                rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={cn(
                  "animate-menu-item flex items-center justify-between border-b border-border/60 py-4 font-display text-2xl font-semibold",
                  isActive(link.href) ? "text-primary" : "text-foreground",
                )}
              >
                {link.label}
                <span className="h-px w-10 bg-primary/30" aria-hidden />
              </Link>
            ))}
            <Link
              href="/admin/login"
              className="animate-menu-item flex items-center gap-2 border-b border-border/60 py-4 font-display text-xl font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <LogIn className="h-5 w-5" />
              Staff Login
            </Link>
            <div className="animate-menu-item flex items-center justify-between border-b border-border/60 py-4">
              <span className="font-display text-xl font-semibold text-foreground">Theme</span>
              <ThemeToggle />
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild size="lg">
                <Link href={bookHref}>
                  <CalendarCheck className="h-5 w-5" />
                  {bookText}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
                  <Phone className="h-5 w-5" />
                  Call {phone}
                </a>
              </Button>
            </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
