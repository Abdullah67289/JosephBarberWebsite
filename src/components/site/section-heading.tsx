import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className,
      )}
    >
      {eyebrow && <span className="eyebrow mb-3">{eyebrow}</span>}
      <h2 className="text-balance font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
      {description && (
        <p className={cn("mt-4 text-pretty text-muted-foreground md:text-lg", align === "center" && "mx-auto")}>
          {description}
        </p>
      )}
    </Reveal>
  );
}
