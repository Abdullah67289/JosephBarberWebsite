import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";

export interface TestimonialItem {
  id: string;
  author: string;
  role?: string | null;
  sourceLabel?: string | null;
  rating: number;
  text: string;
  avatarUrl?: string | null;
}

/**
 * Reviews — three vertically auto-scrolling columns of testimonial cards,
 * faded top and bottom with a mask. Built on the React Bits TestimonialsColumn
 * primitive (framer-motion). Keeps the same `{ items }` API so the home page
 * reviews section is unchanged.
 */
export function Testimonials({ items }: { items: TestimonialItem[] }) {
  if (items.length === 0) return null;

  const mapped = items.map((t) => ({
    text: t.text,
    image: t.avatarUrl,
    name: t.author,
    role: t.role || t.sourceLabel,
  }));

  // Each column must hold enough cards that ONE loop is taller than the visible
  // window — otherwise the column runs out of cards and a gap appears before it
  // repeats. So give every column the full list (rotated for variety), repeated
  // until it comfortably exceeds the ~740px viewport (~5 cards minimum).
  const MIN_PER_COLUMN = 5;
  const base =
    mapped.length >= MIN_PER_COLUMN
      ? mapped
      : Array.from({ length: Math.ceil(MIN_PER_COLUMN / mapped.length) }, () => mapped).flat();
  const rotate = <T,>(arr: T[], n: number): T[] => {
    if (arr.length === 0) return arr;
    const k = ((n % arr.length) + arr.length) % arr.length;
    return [...arr.slice(k), ...arr.slice(0, k)];
  };
  const firstColumn = base;
  const secondColumn = rotate(base, Math.floor(base.length / 3));
  const thirdColumn = rotate(base, Math.floor((base.length * 2) / 3));

  return (
    <div className="mx-auto flex max-h-[740px] max-w-6xl justify-center gap-6 overflow-hidden px-4 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
      <TestimonialsColumn testimonials={firstColumn} duration={15} />
      <TestimonialsColumn testimonials={secondColumn} duration={19} className="hidden md:block" />
      <TestimonialsColumn testimonials={thirdColumn} duration={17} className="hidden lg:block" />
    </div>
  );
}
