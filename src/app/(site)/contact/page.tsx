import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getBusinessHours, getPageContent } from "@/lib/queries";
import { minutesToLabel } from "@/lib/time";
import { PageHeader } from "@/components/site/page-header";
import { ContactForm } from "@/components/site/contact-form";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { LocationMap } from "@/components/ui/expand-map";

export const metadata: Metadata = {
  title: "Contact & Location",
  description: "Find us in downtown Milton. Call, email, or send us a message.",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const revalidate = 300;

export default async function ContactPage() {
  const [settings, page, hours] = await Promise.all([
    getSettings(),
    getPageContent("contact", {
      eyebrow: "Get in Touch",
      title: "Visit the shop",
      subtitle: "Walk in, call ahead, or drop us a line - we'd love to hear from you.",
    }),
    getBusinessHours(),
  ]);
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.dayOfWeek === d)).filter(Boolean);
  const mapQuery = `${settings.address}, ${settings.city}, ${settings.region} ${settings.postalCode}`;
  const mapCoordinates =
    settings.latitude != null && settings.longitude != null
      ? formatCoordinates(settings.latitude, settings.longitude)
      : mapQuery;

  return (
    <>
      <PageHeader eyebrow={page.eyebrow ?? "Get in Touch"} title={page.title} description={page.subtitle ?? undefined} />

      <section className="section">
        <div className="container grid gap-10 lg:grid-cols-2">
          <Reveal className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <a href={`tel:${settings.phone.replace(/[^0-9+]/g, "")}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-md motion-safe:hover:-translate-y-1">
                <Phone className="h-5 w-5 text-primary" />
                <span>
                  <span className="block text-sm font-medium">Call</span>
                  <span className="text-sm text-muted-foreground">{settings.phone}</span>
                </span>
              </a>
              <a href={`mailto:${settings.email}`} className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-md motion-safe:hover:-translate-y-1">
                <Mail className="h-5 w-5 text-primary" />
                <span>
                  <span className="block text-sm font-medium">Email</span>
                  <span className="text-sm text-muted-foreground">{settings.email}</span>
                </span>
              </a>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 sm:col-span-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>
                  <span className="block text-sm font-medium">Find us</span>
                  <span className="text-sm text-muted-foreground">
                    {settings.address}, {settings.city}, {settings.region} {settings.postalCode}
                  </span>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <Clock className="h-4 w-4 text-primary" /> Hours
              </h3>
              <ul className="space-y-1.5 text-sm">
                {ordered.map((h) => (
                  <li key={h!.dayOfWeek} className="flex justify-between">
                    <span className="text-muted-foreground">{DAYS[h!.dayOfWeek]}</span>
                    <span>{h!.isOpen ? `${minutesToLabel(h!.openMinute)} - ${minutesToLabel(h!.closeMinute)}` : "Closed"}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="premium-card grid min-h-[360px] place-items-center overflow-visible p-6 text-center">
              <div className="flex w-full flex-col items-center">
                <LocationMap location={mapQuery} coordinates={mapCoordinates} className="mx-auto" />
                <Button asChild className="mt-5" variant="outline">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open map
                  </a>
                </Button>
              </div>
              <div className="sr-only">
                <p className="text-sm text-muted-foreground">{mapQuery}</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h2 className="mb-4 font-display text-2xl font-bold">Send us a message</h2>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}

function formatCoordinates(latitude: number, longitude: number) {
  const latDirection = latitude >= 0 ? "N" : "S";
  const lngDirection = longitude >= 0 ? "E" : "W";

  return `${Math.abs(latitude).toFixed(4)}° ${latDirection}, ${Math.abs(longitude).toFixed(4)}° ${lngDirection}`;
}
