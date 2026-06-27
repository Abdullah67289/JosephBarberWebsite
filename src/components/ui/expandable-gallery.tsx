"use client";

import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shouldOptimizeImage } from "@/lib/image";

/**
 * ExpandableGallery — a fanned stack of photos that expands into a grid (React
 * Bits "expandable-gallery"). Ported for this codebase: framer-motion instead of
 * the `motion` package and lucide icons instead of @hugeicons (both already
 * installed — no new deps), themed with design tokens, fed real photos via props,
 * and with larger cards to match the section it replaces.
 */
export interface GalleryPhoto {
  id: string;
  src: string;
  alt: string;
}

// Fan layout for the three "stacked" cards (px offsets + rotation).
const STACK_LAYOUT = [
  { rotation: -14, x: -150, y: 16, zIndex: 10 },
  { rotation: -2, x: 0, y: -18, zIndex: 20 },
  { rotation: 13, x: 150, y: 8, zIndex: 30 },
];

const transition = { type: "spring", stiffness: 160, damping: 18, mass: 1 } as const;

export function ExpandableGallery({
  photos,
  ctaLabel = "Explore the gallery",
  tagline = "A look inside the chair — three generations of craft.",
}: {
  photos: GalleryPhoto[];
  ctaLabel?: string;
  tagline?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const layoutGroupId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(containerRef, () => {
    if (isExpanded) setIsExpanded(false);
  });

  if (photos.length === 0) return null;

  return (
    <LayoutGroup id={layoutGroupId}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center">
        {/* Back control — expanded only */}
        <div className="mb-2 flex h-12 w-full items-center px-2">
          <AnimatePresence>
            {isExpanded && (
              <motion.button
                key="back-button"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => setIsExpanded(false)}
                className="group z-50 flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="rounded-full bg-secondary p-2 text-foreground transition-colors group-hover:bg-primary/15">
                  <ArrowLeft className="h-5 w-5" />
                </span>
                <span className="font-medium">Go back</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          ref={containerRef}
          layout
          className={cn(
            "relative w-full",
            isExpanded
              ? "grid grid-cols-2 gap-5 px-2 md:gap-7 lg:grid-cols-3"
              : "flex flex-col items-center justify-start pt-2",
          )}
          transition={transition}
        >
          <div
            className={cn(
              "relative",
              isExpanded ? "contents" : "mb-10 flex h-[400px] w-full items-center justify-center md:h-[520px]",
            )}
          >
            {photos.map((photo, index) => {
              const isPrimary = index < 3;
              if (!isPrimary && !isExpanded) return null;
              const layout = STACK_LAYOUT[index] ?? { rotation: 0, x: 0, y: 0, zIndex: index };

              return (
                <motion.div
                  key={`card-${photo.id}`}
                  layoutId={`card-container-${photo.id}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    rotate: isExpanded ? 0 : layout.rotation,
                    x: isExpanded ? 0 : layout.x,
                    y: isExpanded ? 0 : layout.y,
                    zIndex: isExpanded ? 10 : layout.zIndex,
                  }}
                  transition={transition}
                  whileHover={
                    isExpanded
                      ? { scale: 1.02 }
                      : {
                          scale: 1.05,
                          y: layout.y - 16,
                          rotate: layout.rotation * 0.8,
                          zIndex: 50,
                          transition: { type: "spring", stiffness: 400, damping: 25 },
                        }
                  }
                  onClick={() => !isExpanded && setIsExpanded(true)}
                  className={cn(
                    "cursor-pointer overflow-hidden bg-card",
                    isExpanded
                      ? "relative aspect-[4/3] rounded-[1.75rem] border-4 border-background shadow-xl md:rounded-[2.25rem] md:border-[6px]"
                      : "absolute h-56 w-56 rounded-[2.5rem] border-[6px] border-background shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:h-80 md:w-80",
                  )}
                >
                  <motion.div
                    layoutId={`image-inner-${photo.id}`}
                    layout="position"
                    className="relative h-full w-full"
                    transition={transition}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      unoptimized={!shouldOptimizeImage(photo.src)}
                      className="select-none object-cover"
                      sizes={isExpanded ? "(max-width: 1024px) 50vw, 33vw" : "320px"}
                      priority={isPrimary}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                key="stack-content"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl space-y-7 text-center"
              >
                <p className="text-pretty font-display text-xl font-medium leading-snug text-foreground/90 md:text-2xl">
                  {tagline}
                </p>
                <div className="flex justify-center">
                  <Button onClick={() => setIsExpanded(true)} size="lg" className="group rounded-full px-8">
                    {ctaLabel}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}

export default ExpandableGallery;
