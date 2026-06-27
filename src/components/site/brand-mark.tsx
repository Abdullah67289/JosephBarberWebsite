import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  animated?: boolean;
};

export function BrandMark({ className, animated = true }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md border border-primary/40 bg-card",
        className,
      )}
      aria-hidden
    >
      <span className={cn("absolute inset-0 barber-pole opacity-80", animated && "brand-pole-animated")} />
      <span className="relative z-10 font-display text-sm font-bold text-ink-950">JM</span>
    </span>
  );
}
