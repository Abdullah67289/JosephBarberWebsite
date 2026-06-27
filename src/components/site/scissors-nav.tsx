"use client";

import Link from "next/link";
import { ShoppingBag, Mail } from "lucide-react";
import type { NavLink } from "./navbar";

/**
 * Desktop scissors navbar. /scissors-navbar.png is a transparent cutout of the
 * black carbon scissors. Each nav item is physically mapped onto a part of the
 * scissors (percentages measured from the trimmed 1227x437 image):
 *   - Home          → the centre pivot screw (invisible click target, no label)
 *   - Service | Gallery → the left blade (tilted to follow the blade)
 *   - Our Story     → centred in the open triangle between the right-side legs
 *   - Shop          → icon centred in the upper finger-ring hole
 *   - Contact       → icon centred in the lower finger-ring hole
 */
const POS = {
  home: { left: "46%", top: "50.3%" }, // pivot screw
  blade: { left: "26.5%", top: "50%" }, // left blade
  story: { left: "70%", top: "50%" }, // triangle opening between the right legs
  shop: { left: "83%", top: "26%" }, // upper ring hole (measured centre)
  contact: { left: "83%", top: "74%" }, // lower ring hole (measured centre)
} as const;

export function ScissorsNav({
  links,
  isActive,
}: {
  links: NavLink[];
  isActive: (href: string) => boolean;
}) {
  const get = (href: string) => links.find((l) => l.href === href);
  const home = get("/");
  const services = get("/services");
  const gallery = get("/gallery");
  const shop = get("/shop");
  const story = get("/story");
  const contact = get("/contact");

  const linkProps = (l: NavLink) => ({
    href: l.href,
    target: l.openInNewTab ? "_blank" : undefined,
    rel: l.openInNewTab ? "noopener noreferrer" : undefined,
    "aria-current": isActive(l.href) ? ("page" as const) : undefined,
    "data-active": isActive(l.href),
  });

  return (
    <div className="scissors-nav relative hidden aspect-[1227/437] h-[156px] shrink-0 lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/scissors-navbar.png"
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain object-center drop-shadow-[0_10px_8px_rgba(0,0,0,0.70)]"
      />
      <nav aria-label="Primary navigation" className="absolute inset-0">
        {/* Home — the pivot screw is the button (no visible label). */}
        {home && (
          <Link
            {...linkProps(home)}
            aria-label={home.label}
            title={home.label}
            className="scissors-home absolute -translate-x-1/2 -translate-y-1/2"
            style={POS.home}
          />
        )}

        {/* Service | Gallery — on the left blade, tilted to follow its angle. */}
        {(services || gallery) && (
          <div className="scissors-blade-group absolute" style={POS.blade}>
            {services && (
              <Link {...linkProps(services)} className="scissors-link">
                {services.label}
              </Link>
            )}
            {services && gallery && (
              <span className="scissors-sep" aria-hidden>
                |
              </span>
            )}
            {gallery && (
              <Link {...linkProps(gallery)} className="scissors-link">
                {gallery.label}
              </Link>
            )}
          </div>
        )}

        {/* Our Story — centred in the open triangle between the right legs. */}
        {story && (
          <Link
            {...linkProps(story)}
            className="scissors-link absolute -translate-x-1/2 -translate-y-1/2"
            style={POS.story}
          >
            {story.label}
          </Link>
        )}

        {/* Shop — icon centred in the upper finger-ring hole. */}
        {shop && (
          <Link
            {...linkProps(shop)}
            aria-label={shop.label}
            title={shop.label}
            className="scissors-ring absolute -translate-x-1/2 -translate-y-1/2"
            style={POS.shop}
          >
            <ShoppingBag className="h-[17px] w-[17px]" />
          </Link>
        )}

        {/* Contact — icon centred in the lower finger-ring hole. */}
        {contact && (
          <Link
            {...linkProps(contact)}
            aria-label={contact.label}
            title={contact.label}
            className="scissors-ring absolute -translate-x-1/2 -translate-y-1/2"
            style={POS.contact}
          >
            <Mail className="h-[17px] w-[17px]" />
          </Link>
        )}
      </nav>
    </div>
  );
}
