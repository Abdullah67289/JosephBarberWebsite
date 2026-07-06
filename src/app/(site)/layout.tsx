import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { SiteIntro } from "@/components/site/site-intro";
import { PageEdgeBlur } from "@/components/site/page-edge-blur";
import { getSettings } from "@/lib/settings";
import { getNavigationLinks } from "@/lib/queries";

// D1 only exists inside a live Worker request, never during the Cloudflare
// build step — ISR (revalidate) would try to prerender with real DB queries
// at build time and fail. Render per-request instead.
export const dynamic = "force-dynamic";

const FALLBACK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/shop", label: "Shop" },
  { href: "/story", label: "Our Story" },
  { href: "/contact", label: "Contact" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [s, navLinks] = await Promise.all([getSettings(), getNavigationLinks("header")]);
  const links = (navLinks.length ? navLinks : FALLBACK_LINKS)
    .filter((link) => s.showShopInNav || !link.href.startsWith("/shop"))
    .map((link) => ({
      href: link.href,
      label: link.label,
      openInNewTab: "openInNewTab" in link && typeof link.openInNewTab === "boolean" ? link.openInNewTab : false,
  }));
  return (
    <div className="theme-cream flex min-h-screen flex-col bg-background text-foreground">
      <SiteIntro businessName={s.businessName} />
      <Navbar
        businessName={s.businessName}
        phone={s.phone}
        logoUrl={s.logoUrl}
        links={links}
        bookText={s.navBookText}
        bookHref={s.navBookHref}
        showCartButton={s.showCartButton}
      />
      <main className="flex-1">{children}</main>
      <Footer />
      <PageEdgeBlur />
    </div>
  );
}
