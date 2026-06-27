"use client";

import DisplayCards from "@/components/ui/display-cards";
import { ServiceIcon } from "@/components/site/service-icon";
import { formatMoney } from "@/lib/money";
import type { ServiceCardData } from "@/components/site/service-card";

/**
 * The "Services & Pricing" home section, shown as the React Bits DisplayCards
 * fanned stack — the top three featured services as icon + name / price /
 * duration. Scaled down on small screens so the fan fits.
 */
const STACK_CLASSES = [
  "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
];

export function ServicesDisplayCards({ services }: { services: ServiceCardData[] }) {
  const cards = services.slice(0, 3).map((service, index) => ({
    icon: <ServiceIcon name={service.icon} className="size-4 text-primary" />,
    title: service.name,
    description: formatMoney(service.priceCents),
    date: `${service.durationMin} min`,
    className: STACK_CLASSES[index],
  }));

  if (cards.length === 0) return null;

  return (
    <div className="flex min-h-[360px] w-full items-center justify-center overflow-hidden py-4">
      <div className="origin-center scale-[0.72] sm:scale-90 lg:scale-100">
        <DisplayCards cards={cards} />
      </div>
    </div>
  );
}

export default ServicesDisplayCards;
