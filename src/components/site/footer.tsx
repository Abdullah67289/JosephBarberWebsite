import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, Youtube, Clock } from "lucide-react";
import { BrandMark } from "@/components/site/brand-mark";
import { getSettings } from "@/lib/settings";
import { getNavigationLinks } from "@/lib/queries";
import { db } from "@/lib/db";
import { minutesToLabel } from "@/lib/time";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function Footer() {
  const [s, hours, footerLinks] = await Promise.all([
    getSettings(),
    db.businessHour.findMany({ orderBy: { dayOfWeek: "asc" } }),
    getNavigationLinks("footer"),
  ]);
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.dayOfWeek === d)).filter(Boolean);
  const exploreLinks = (footerLinks.length
    ? footerLinks
    : [
        { href: "/services", label: "Services & Pricing", openInNewTab: false },
        { href: "/book", label: "Book an Appointment", openInNewTab: false },
        { href: "/gallery", label: "Gallery", openInNewTab: false },
        { href: "/shop", label: "Shop Products", openInNewTab: false },
        { href: "/story", label: "Our Story", openInNewTab: false },
        { href: "/contact", label: "Contact", openInNewTab: false },
      ]).filter((link) => s.showShopInNav || !link.href.startsWith("/shop"));

  const socials = [
    { href: s.instagramUrl, icon: Instagram, label: "Instagram" },
    { href: s.facebookUrl, icon: Facebook, label: "Facebook" },
    { href: s.youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter((x) => x.href);

  return (
    <footer className="theme-charcoal border-t border-primary/20 bg-ink-950 text-foreground">
      <div className="container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-bold">{s.businessName}</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
          {socials.length > 0 && (
            <div className="flex gap-2 pt-1">
              {socials.map((soc) => (
                <a
                  key={soc.label}
                  href={soc.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={soc.label}
                  className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:text-primary focus-visible:border-primary/50 focus-visible:text-primary motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-105"
                >
                  <soc.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Explore</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {exploreLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  target={l.openInNewTab ? "_blank" : undefined}
                  rel={l.openInNewTab ? "noopener noreferrer" : undefined}
                  className="transition-colors hover:text-primary focus-visible:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Visit Us</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {s.address}
                <br />
                {s.city}, {s.region} {s.postalCode}
              </span>
            </li>
            <li>
              <a href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-2.5 transition-colors hover:text-primary focus-visible:text-primary">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {s.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${s.email}`} className="flex items-center gap-2.5 transition-colors hover:text-primary focus-visible:text-primary">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                {s.email}
              </a>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Hours
          </h4>
          <ul className="space-y-1.5 text-sm">
            {ordered.map((h) => (
              <li key={h!.dayOfWeek} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{DAYS[h!.dayOfWeek]}</span>
                <span className="text-foreground">
                  {h!.isOpen ? `${minutesToLabel(h!.openMinute)} - ${minutesToLabel(h!.closeMinute)}` : "Closed"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {s.businessName}. All rights reserved.
          </p>
          <p className="flex items-center gap-4">
            <span>Est. 1966 · Milton, Ontario</span>
            <Link href="/admin/login" className="transition-colors hover:text-primary focus-visible:text-primary">
              Staff Portal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
