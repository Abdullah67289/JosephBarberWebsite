import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight, CalendarCheck } from "lucide-react";
import { getPageContent, getServiceCategoriesWithServices } from "@/lib/queries";
import { ServiceIcon } from "@/components/site/service-icon";
import { PageHeader } from "@/components/site/page-header";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Services & Pricing",
  description: "Haircuts, fades, beard trims, hot-towel shaves and more — transparent pricing at Joseph & Mike's.",
};

export const revalidate = 300;

export default async function ServicesPage() {
  const [page, categories] = await Promise.all([
    getPageContent("services", {
      eyebrow: "Services & Pricing",
      title: "The full menu",
      subtitle: "Every service is finished with the care that's kept Milton coming back since 1966.",
    }),
    getServiceCategoriesWithServices(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={page.eyebrow ?? "Services & Pricing"}
        title={page.title}
        description={page.subtitle ?? undefined}
      >
        <Button asChild size="lg">
          <Link href={page.ctaHref || "/book"}>
            <CalendarCheck className="h-5 w-5" /> Book an appointment
          </Link>
        </Button>
      </PageHeader>

      <section className="section section-build">
        <div className="container space-y-16">
          {categories.map((cat) => (
            <div key={cat.id}>
              <Reveal className="mb-7 flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold md:text-3xl">{cat.name}</h2>
                  {cat.description && <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>}
                </div>
              </Reveal>
              <Stagger className="grid gap-4 md:grid-cols-2">
                {cat.services.map((s) => (
                  <StaggerItem key={s.id}>
                    <div className="premium-card group flex min-h-[190px] flex-col gap-4 p-5 sm:flex-row sm:items-start">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                        <ServiceIcon name={s.icon} className="h-6 w-6" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col self-stretch">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                          <h3 className="text-pretty font-display text-lg font-semibold leading-tight">{s.name}</h3>
                          <span className="shrink-0 font-display text-lg font-bold leading-none">{formatMoney(s.priceCents)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                        <div className="mt-auto flex items-center justify-between pt-4">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> {s.durationMin} min
                          </span>
                          {s.isBookable && (
                            <Link href={`/book?service=${s.slug}`} className="flex items-center gap-1 text-xs font-medium text-primary opacity-100 transition-opacity hover:text-primary/80">
                              Book <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
