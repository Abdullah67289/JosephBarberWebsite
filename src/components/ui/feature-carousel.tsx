"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * FeatureCarousel — a 3D coverflow carousel (adapted from the React Bits
 * "feature-carousel" HeroSection). The centre image is sharp and full size;
 * neighbours are scaled back, rotated in 3D and dimmed. Only transform/opacity
 * are animated (compositor-only) so photo switches never glitch. It auto-advances
 * (paused on hover/focus and when the user prefers reduced motion) and exposes
 * prev/next controls.
 *
 * Unlike the original full-screen hero, this is section-friendly: no forced
 * min-h-screen, no title/subtitle (the surrounding section supplies its own
 * heading) and theme-token colours instead of the demo's purple/blue gradient.
 */
export interface FeatureCarouselImage {
  src: string;
  alt: string;
}

interface FeatureCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  images: FeatureCarouselImage[];
  /** Auto-advance interval in ms. Pass 0 to disable. */
  autoPlayInterval?: number;
}

export const FeatureCarousel = React.forwardRef<HTMLDivElement, FeatureCarouselProps>(
  ({ images, autoPlayInterval = 4000, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(() => Math.floor(images.length / 2));
    const pausedRef = React.useRef(false);

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = React.useCallback(() => {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    // Auto-advance — disabled for reduced-motion users and while paused.
    React.useEffect(() => {
      if (!autoPlayInterval || images.length <= 1) return;
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const timer = window.setInterval(() => {
        if (!pausedRef.current) handleNext();
      }, autoPlayInterval);
      return () => window.clearInterval(timer);
    }, [handleNext, autoPlayInterval, images.length]);

    if (images.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn("relative w-full overflow-hidden", className)}
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onFocusCapture={() => (pausedRef.current = true)}
        onBlurCapture={() => (pausedRef.current = false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Gallery photos"
        {...props}
      >
        <div className="relative flex h-[360px] w-full items-center justify-center [perspective:1000px] md:h-[460px]">
          {images.map((image, index) => {
            const offset = index - currentIndex;
            const total = images.length;
            let pos = (offset + total) % total;
            if (pos > Math.floor(total / 2)) pos = pos - total;

            const isCenter = pos === 0;
            const isAdjacent = Math.abs(pos) === 1;
            // Only render a small window around the centre. Cards beyond it are
            // display:none, so the far card never springs all the way across the
            // screen on wrap-around (the main glitch), and the edge cards (pos ±2,
            // opacity 0) act as a fade buffer so neighbours never pop in/out.
            const isRendered = Math.abs(pos) <= 2;

            return (
              <motion.div
                key={index}
                className="absolute flex h-80 w-56 items-center justify-center will-change-transform md:h-[440px] md:w-72"
                initial={false}
                animate={{
                  x: `${pos * 52}%`,
                  y: isCenter ? 0 : 12,
                  scale: isCenter ? 1 : isAdjacent ? 0.82 : 0.66,
                  rotateY: pos * -15,
                  rotateZ: isCenter ? 0 : pos * -1.4,
                  opacity: isCenter ? 1 : isAdjacent ? 0.38 : 0,
                }}
                transition={
                  isRendered
                    ? {
                        x: { type: "spring", stiffness: 220, damping: 30, mass: 0.82 },
                        y: { type: "spring", stiffness: 240, damping: 32, mass: 0.78 },
                        scale: { type: "spring", stiffness: 230, damping: 31, mass: 0.78 },
                        rotateY: { type: "spring", stiffness: 220, damping: 32, mass: 0.82 },
                        rotateZ: { type: "spring", stiffness: 220, damping: 32, mass: 0.82 },
                        opacity: { duration: 0.32, ease: "easeOut" },
                      }
                    : { duration: 0 }
                }
                style={{
                  zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                  pointerEvents: isCenter ? "auto" : "none",
                  transformStyle: "preserve-3d",
                  display: isRendered ? undefined : "none",
                }}
                aria-hidden={!isCenter}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  draggable={false}
                  className="relative z-0 h-full w-full rounded-3xl border border-border object-cover shadow-card-hover"
                />
              </motion.div>
            );
          })}

          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full bg-background/60 backdrop-blur-sm sm:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-20 h-10 w-10 -translate-y-1/2 rounded-full bg-background/60 backdrop-blur-sm sm:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  },
);

FeatureCarousel.displayName = "FeatureCarousel";

export default FeatureCarousel;
