import { Reveal } from "@/components/motion/reveal";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border pt-32 pb-16 md:pt-40 md:pb-20">
      <div className="absolute inset-0 -z-10 bg-radial-spot" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        aria-hidden
      />
      <div className="container max-w-3xl text-center">
        <Reveal>
          {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>
          {description && (
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
              {description}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </Reveal>
      </div>
    </section>
  );
}
