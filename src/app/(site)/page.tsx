import Link from "next/link";
import Image from "next/image";
import {
  Scissors,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  Award,
  Users,
  CalendarCheck,
  Sparkles,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import {
  getActiveServices,
  getActiveStaff,
  getProducts,
  getGalleryImages,
  getTestimonials,
  getRatingSummary,
  getBusinessHours,
  getPageContent,
  getHomeSections,
  getSiteStats,
} from "@/lib/queries";
import { minutesToLabel } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { LocationMap } from "@/components/ui/expand-map";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { SectionHeading } from "@/components/site/section-heading";
import { Hero } from "@/components/site/sections/hero";
import { ServicesDisplayCards } from "@/components/site/services-display-cards";
import { TeamCard } from "@/components/site/team-card";
import { GalleryShowcase } from "@/components/site/gallery-showcase";
import { Testimonials } from "@/components/site/testimonials";
import { FlowingMenuFeature } from "@/components/site/flowing-menu-feature";
import { CraftDetail } from "@/components/site/sections/craft-detail";
import { ProductPreviewCard } from "@/components/shop/product-preview-card";
import { shouldOptimizeImage } from "@/lib/image";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STAT_ICONS = { award: Award, users: Users, scissors: Scissors, sparkles: Sparkles };

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, page, sections, stats, services, staff, products, gallery, testimonials, rating, hours] =
    await Promise.all([
      getSettings(),
      getPageContent("home", {
        eyebrow: "Est. 1966",
        title: "A Cut Above",
        subtitle: "Where tradition meets modern craft.",
        ctaText: "Book Your Appointment",
        ctaHref: "/book",
        secondaryCtaText: "View Services",
        secondaryCtaHref: "/services",
      }),
      getHomeSections(),
      getSiteStats(),
      getActiveServices(),
      getActiveStaff(),
      getProducts({ featuredOnly: true }),
      getGalleryImages({ featuredOnly: true }),
      getTestimonials(true),
      getRatingSummary(),
      getBusinessHours(),
    ]);

  const section = (key: string) => sections.find((s) => s.sectionKey === key);
  const visible = (key: string) => Boolean(section(key));
  const limit = (key: string, fallback: number) => section(key)?.itemLimit || fallback;

  const featuredServices = (services.some((s) => s.isFeatured) ? services.filter((s) => s.isFeatured) : services).slice(
    0,
    limit("services", 6),
  );
  const featuredStaff = staff.slice(0, limit("barbers", staff.length));
  const galleryPreview = (gallery.length ? gallery : await getGalleryImages()).slice(0, limit("gallery", 9));
  const featuredProducts = products.slice(0, limit("products", 4));
  const orderedHours = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => hours.find((h) => h.dayOfWeek === d))
    .filter(Boolean);
  const displayStats =
    stats.length > 0
      ? stats.slice(0, 4).map((s) => ({
          icon: STAT_ICONS[(s.icon ?? "sparkles") as keyof typeof STAT_ICONS] ?? Sparkles,
          value: s.value,
          suffix: s.suffix ?? "",
          label: s.label,
        }))
      : [
          { icon: Award, value: 58, suffix: "+", label: "Years of craft" },
          { icon: Users, value: Math.max(rating.count * 250, 12000), suffix: "+", label: "Cuts delivered" },
          { icon: Scissors, value: staff.length, suffix: "", label: "Master barbers" },
          { icon: Sparkles, value: Math.round(rating.avg * 10) / 10, suffix: " stars", label: "Average rating" },
        ];

  const craftPhotos = (gallery.length ? gallery : galleryPreview)
    .slice(0, 9)
    .map((g) => ({ id: g.id, src: g.url, alt: g.alt ?? g.title ?? "Joseph & Mike's Barbershop" }));
  const mapLocation = `${settings.address}, ${settings.city}`;
  const mapCoordinates =
    settings.latitude != null && settings.longitude != null
      ? formatCoordinates(settings.latitude, settings.longitude)
      : `${settings.city}, ${settings.region} ${settings.postalCode}`;
  return (
    <>
      <Hero
        headline={page.title || settings.heroHeadline || "A Cut Above"}
        subheadline={page.subtitle || settings.heroSubheadline}
        imageUrl={page.heroImageUrl || settings.heroImageUrl}
        rating={rating.avg}
        reviewCount={Math.max(rating.count, 50)}
        city={settings.city}
        eyebrow={page.eyebrow ?? undefined}
        primaryCtaText={page.ctaText || settings.heroPrimaryCtaText}
        primaryCtaHref={page.ctaHref || settings.heroPrimaryCtaHref}
        secondaryCtaText={page.secondaryCtaText || settings.heroSecondaryCtaText}
        secondaryCtaHref={page.secondaryCtaHref || settings.heroSecondaryCtaHref}
        addressLine={`${settings.address}, ${settings.city}`}
      />

      {visible("stats") && (
        <section className="section-build border-y border-border bg-card/30">
          <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
            {displayStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.08} className="text-center">
                <stat.icon className="mx-auto mb-3 h-6 w-6 text-primary" />
                <div className="font-display text-3xl font-bold md:text-4xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <CraftDetail photos={craftPhotos} />

      {visible("story") && (
        <section className="section section-build">
          <div className="container grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="relative">
                <div className="premium-image relative aspect-[4/3] overflow-hidden rounded-2xl border border-border">
                  {(page.heroImageUrl || settings.heroImageUrl) && (
                    <Image
                      src={page.heroImageUrl || settings.heroImageUrl || ""}
                      alt="Inside Joseph & Mike's Barbershop"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      unoptimized={!shouldOptimizeImage(page.heroImageUrl || settings.heroImageUrl || "")}
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="absolute -bottom-6 -right-4 hidden rounded-xl border border-primary/30 bg-card p-5 shadow-card-hover sm:block">
                  <p className="font-display text-3xl font-bold text-primary">1966</p>
                  <p className="text-xs text-muted-foreground">Serving Milton since</p>
                </div>
              </div>
            </Reveal>
            <div>
              <SectionHeading
                align="left"
                eyebrow={section("story")?.eyebrow || "Our Story"}
                title={section("story")?.title || settings.aboutTitle || "Three generations behind the chair"}
              />
              <Reveal delay={0.1}>
                <p className="mt-5 text-pretty leading-relaxed text-muted-foreground">
                  {(section("story")?.subtitle || settings.aboutBody || settings.description).slice(0, 360)}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={section("story")?.ctaHref || "/story"}>
                      {section("story")?.ctaText || "Read our story"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/book">Book a chair</Link>
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {visible("services") && featuredServices.length > 0 && (
        <section id="services" className="section section-build border-t border-border bg-card/30">
          <div className="container">
            <SectionHeading
              eyebrow={section("services")?.eyebrow || "Services & Pricing"}
              title={section("services")?.title || "Crafted cuts, classic care"}
              description={section("services")?.subtitle || "From precision fades to the traditional hot-towel shave, every service is finished with care."}
            />
            <div className="mt-8">
              <ServicesDisplayCards services={featuredServices} />
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href={section("services")?.ctaHref || "/services"}>
                  {section("services")?.ctaText || "View all services"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <FlowingMenuFeature />

      {visible("barbers") && featuredStaff.length > 0 && (
        <section className="section section-build">
          <div className="container">
            <SectionHeading
              eyebrow={section("barbers")?.eyebrow || "The Team"}
              title={section("barbers")?.title || "Meet your barbers"}
              description={section("barbers")?.subtitle || "Skilled hands, sharp eyes, and decades of combined experience."}
            />
            <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredStaff.map((m) => (
                <StaggerItem key={m.id}>
                  <TeamCard member={m} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )}

      {visible("gallery") && galleryPreview.length > 0 && (
        <section className="section border-t border-border bg-card/30">
          <div className="container">
            <SectionHeading
              eyebrow={section("gallery")?.eyebrow || "Gallery"}
              title={section("gallery")?.title || "The work speaks for itself"}
              description={section("gallery")?.subtitle || undefined}
            />
            <div className="mt-12">
              <GalleryShowcase
                images={galleryPreview.map((g) => ({
                  src: g.url,
                  alt: g.alt ?? g.title ?? g.caption ?? "Joseph & Mike's Barbershop work",
                }))}
              />
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href={section("gallery")?.ctaHref || "/gallery"}>
                  {section("gallery")?.ctaText || "View full gallery"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {visible("reviews") && testimonials.length > 0 && (
        <section className="section section-build">
          <div className="container">
            <SectionHeading
              eyebrow={section("reviews")?.eyebrow || "Reviews"}
              title={section("reviews")?.title || "Loved by Milton"}
              description={section("reviews")?.subtitle || undefined}
            />
          </div>
          <div className="mt-12">
            <Testimonials items={testimonials} />
          </div>
        </section>
      )}

      {visible("products") && settings.showShopInNav && featuredProducts.length > 0 && (
        <section className="section section-build border-t border-border bg-card/30">
          <div className="container">
            <SectionHeading
              eyebrow={section("products")?.eyebrow || "The Shop"}
              title={section("products")?.title || "Take the shop home"}
              description={section("products")?.subtitle || "Premium grooming products hand-picked by our barbers."}
            />
            <div className="mt-12 grid justify-center gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,280px))]">
              {featuredProducts.map((p) => (
                <ProductPreviewCard key={p.id} product={p} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href={section("products")?.ctaHref || "/shop"}>
                  {section("products")?.ctaText || "Shop all products"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {visible("visit") && (
        <section className="section section-build">
          <div className="container grid gap-10 lg:grid-cols-2">
            <Reveal>
              <span className="eyebrow mb-3">{section("visit")?.eyebrow || "Visit Us"}</span>
              <h2 className="font-display text-3xl font-bold md:text-5xl">{section("visit")?.title || "Hours & location"}</h2>
              <div className="mt-6 space-y-3 text-sm">
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <span>
                    {settings.address}
                    <br />
                    {settings.city}, {settings.region} {settings.postalCode}
                  </span>
                </p>
                <a href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-3 hover:text-primary">
                  <Phone className="h-5 w-5 text-primary" /> {settings.phone}
                </a>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                  <Clock className="h-4 w-4 text-primary" /> Opening Hours
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {orderedHours.map((h) => (
                    <li key={h!.dayOfWeek} className="flex justify-between">
                      <span className="text-muted-foreground">{DAYS[h!.dayOfWeek]}</span>
                      <span>{h!.isOpen ? `${minutesToLabel(h!.openMinute)} - ${minutesToLabel(h!.closeMinute)}` : "Closed"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild className="mt-6" size="lg">
                <Link href="/book">
                  <CalendarCheck className="h-5 w-5" /> Book an appointment
                </Link>
              </Button>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="flex h-full min-h-[360px] items-center justify-center overflow-visible">
                <LocationMap location={mapLocation} coordinates={mapCoordinates} className="mx-auto" />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {visible("cta") && (
        <section className="section-build relative overflow-hidden border-t border-border">
          <div className="absolute inset-0 -z-10 bg-radial-spot" aria-hidden />
          <div className="container py-20 text-center md:py-28">
            <Reveal>
              <h2 className="text-balance font-display text-4xl font-bold md:text-6xl">
                {section("cta")?.title || "Ready for your best cut yet?"}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground md:text-lg">
                {section("cta")?.subtitle || "Book online in under a minute. Walk-ins always welcome."}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="xl">
                  <Link href={section("cta")?.ctaHref || "/book"}>
                    <CalendarCheck className="h-5 w-5" /> {section("cta")?.ctaText || "Book Now"}
                  </Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <a href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`}>
                    <Phone className="h-5 w-5" /> Call {settings.phone}
                  </a>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

function formatCoordinates(latitude: number, longitude: number) {
  const latDirection = latitude >= 0 ? "N" : "S";
  const lngDirection = longitude >= 0 ? "E" : "W";

  return `${Math.abs(latitude).toFixed(4)}Â° ${latDirection}, ${Math.abs(longitude).toFixed(4)}Â° ${lngDirection}`;
}
