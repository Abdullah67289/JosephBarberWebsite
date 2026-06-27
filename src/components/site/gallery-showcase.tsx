"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { FeatureCarousel, type FeatureCarouselImage } from "@/components/ui/feature-carousel";

/**
 * GalleryShowcase — wraps the coverflow carousel in a scroll-linked 3D reveal.
 *
 * As the section travels through the viewport, the whole gallery rises, tilts up
 * out of the page (rotateX), scales to full size at centre, then leans away and
 * dims as it exits. The progress is spring-smoothed so it feels weighty rather
 * than 1:1 with the scrollbar. The carousel's own coverflow/autoplay is
 * untouched — this only animates the container.
 */
export function GalleryShowcase({ images }: { images: FeatureCarouselImage[] }) {
  const ref = useRef<HTMLDivElement>(null);

  // 0 → as the section top enters the bottom of the viewport,
  // 1 → as the section bottom leaves the top of the viewport.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  const rotateX = useTransform(p, [0, 0.5, 1], [16, 0, -9]);
  const scale = useTransform(p, [0, 0.5, 1], [0.86, 1, 0.95]);
  const y = useTransform(p, [0, 0.5, 1], [90, 0, -50]);
  const opacity = useTransform(p, [0, 0.16, 0.84, 1], [0.3, 1, 1, 0.5]);

  return (
    <div ref={ref} className="[perspective:1400px]">
      <motion.div
        style={{ rotateX, scale, y, opacity, transformOrigin: "center top" }}
        className="will-change-transform"
      >
        <FeatureCarousel images={images} />
      </motion.div>
    </div>
  );
}

export default GalleryShowcase;
