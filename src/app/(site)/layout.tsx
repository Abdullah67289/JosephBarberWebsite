import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import GradualBlur from "@/components/animations/GradualBlur";
import { getSettings } from "@/lib/settings";
import { getNavigationLinks } from "@/lib/queries";

export const revalidate = 300;

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
      <GradualBlur
        target="page"
        position="bottom"
        height="6rem"
        strength={2}
        divCount={5}
        curve="bezier"
        exponential
        opacity={1}
        style={{ zIndex: 20 }}
      />
    </div>
  );
}
