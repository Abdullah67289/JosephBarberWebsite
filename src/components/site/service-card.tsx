import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ServiceIcon } from "@/components/site/service-icon";
import { formatMoney } from "@/lib/money";

export interface ServiceCardData {
  id: string;
  name: string;
  slug: string;
  description: string;
  durationMin: number;
  priceCents: number;
  icon?: string | null;
  isBookable?: boolean;
}

export function ServiceCard({ service }: { service: ServiceCardData }) {
  const content = (
    <div className="premium-card group flex h-full min-h-[280px] flex-col p-6">
      <div className="mb-5 flex min-h-12 items-start justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <ServiceIcon name={service.icon} className="h-6 w-6" />
        </span>
        <span className="shrink-0 font-display text-xl font-bold leading-none text-foreground">{formatMoney(service.priceCents)}</span>
      </div>

      <h3 className="font-display text-xl font-semibold tracking-tight">{service.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">{service.description}</p>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-4 w-4" />
          {service.durationMin} min
        </span>
        {service.isBookable !== false && (
          <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within/card:translate-x-0 group-focus-within/card:opacity-100 -translate-x-2">
            Book <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );

  if (service.isBookable === false) return content;

  return (
    <Link
      href={`/book?service=${service.slug}`}
      className="group/card block h-full rounded-xl focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
