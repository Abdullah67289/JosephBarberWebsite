"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { CalendarCheck, Scissors, Star, ChevronDown, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shouldOptimizeImage } from "@/lib/image";

export function Hero({
  headline,
  subheadline,
  imageUrl,
  rating,
  reviewCount,
  city,
  eyebrow,
  primaryCtaText,
  primaryCtaHref,
  secondaryCtaText,
  secondaryCtaHref,
  addressLine,
}: {
  headline: string;
  subheadline: string;
  imageUrl?: string | null;
  rating: number;
  reviewCount: number;
  city: string;
  eyebrow?: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText?: string | null;
  secondaryCtaHref?: string | null;
  addressLine: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  // Arm entrance animations only after mount so SSR and the client's first
  // render are identical (prevents the Framer Motion hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "18%"]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  const words = headline.split(" ");

  return (
    <section ref={ref} className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
      {/* Background image + parallax */}
      <motion.div style={{ y: imageY }} className="absolute inset-0 -z-20 scale-110">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized={!shouldOptimizeImage(imageUrl)}
            className="object-cover"
          />
        )}
      </motion.div>
      <motion.div style={{ opacity: overlayOpacity }} className="absolute inset-0 -z-10" aria-hidden>
        {/* Subdued veil so the photograph reads as a true full-bleed background on
            every screen size — the same immersive feel on phone, tablet and desktop. */}
        <div className="absolute inset-0 bg-background/45" />
        {/* Extra protection behind the left-aligned copy so the headline stays crisp. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
        {/* Blend the bottom into the page (beneath the gradual blur) + soft top veil.
            Kept partly translucent so the photo still reads behind the gradual
            blur band — otherwise the blur would sit over solid cream and vanish. */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/65 to-transparent" />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-radial-spot" aria-hidden />
      <div
        className="absolute inset-0 -z-10 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:40px_40px]"
        aria-hidden
      />

      <div className="container py-28">
        <div className="max-w-3xl">
          <motion.div
            initial={mounted ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow mb-6"
          >
            <Scissors className="h-3.5 w-3.5" />
            {eyebrow || `Downtown ${city}`}
          </motion.div>

          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={mounted ? { opacity: 0, y: 28 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={i === words.length - 1 ? "text-gold-gradient" : ""}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={mounted ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground"
          >
            {subheadline}
          </motion.p>

          <motion.div
            initial={mounted ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button asChild size="xl">
              <Link href={primaryCtaHref}>
                <CalendarCheck className="h-5 w-5" />
                {primaryCtaText}
              </Link>
            </Button>
            {secondaryCtaText && secondaryCtaHref && (
              <Button asChild size="xl" variant="outline">
                <Link href={secondaryCtaHref}>{secondaryCtaText}</Link>
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={mounted ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i < Math.round(rating) ? "fill-primary text-primary" : "text-muted"}`}
                  />
                ))}
              </div>
              <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
              <span>· {reviewCount}+ happy clients</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {addressLine}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={mounted && !reduced ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={reduced ? undefined : { delay: 1.4 }}
        className="absolute bottom-7 left-1/2 z-[1001] -translate-x-1/2"
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, 8, 0] }}
          transition={reduced ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1 text-muted-foreground"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}
