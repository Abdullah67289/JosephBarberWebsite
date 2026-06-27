import { Fragment, type CSSProperties } from "react";
import styles from "./testimonials-columns.module.css";

/**
 * TestimonialsColumn — a vertically auto-scrolling column of testimonial cards
 * (adapted from the React Bits "testimonials-columns-1" component).
 *
 * Adaptations for this codebase:
 *  - the infinite scroll is driven by a CSS keyframe animation rather than
 *    framer-motion. CSS animations run as soon as the HTML paints (no waiting on
 *    JS hydration), so on this heavy page the reviews no longer load late or pop
 *    in — and there is no client JS for this component at all (server component);
 *  - each card carries its own trailing margin so the doubled list loops
 *    seamlessly at translateY(-50%);
 *  - themed with design tokens, with an initials-badge avatar fallback for
 *    reviews that have no photo.
 */
export interface TestimonialColumnItem {
  text: string;
  image?: string | null;
  name: string;
  role?: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialColumnItem[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <div className={styles.scroller} style={{ "--duration": `${props.duration ?? 10}s` } as CSSProperties}>
        {[0, 1].map((dup) => (
          <Fragment key={dup}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <figure
                key={i}
                aria-hidden={dup === 1 ? true : undefined}
                className="w-full max-w-xs rounded-3xl border border-border bg-card p-8 shadow-lg shadow-primary/10"
              >
                <blockquote className="text-sm leading-relaxed text-foreground/90">&ldquo;{text}&rdquo;</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={name}
                      className="h-10 w-10 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/10 font-display text-sm font-bold text-primary">
                      {initials(name)}
                    </span>
                  )}
                  <div className="flex flex-col">
                    <div className="font-display font-semibold leading-5 tracking-tight">{name}</div>
                    {role && <div className="leading-5 tracking-tight text-muted-foreground">{role}</div>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default TestimonialsColumn;
