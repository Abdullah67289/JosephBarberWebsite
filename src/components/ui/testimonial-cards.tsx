"use client";

import * as React from "react";
import { motion } from "framer-motion";

export type CardPosition = "front" | "middle" | "back";

export interface TestimonialCardProps {
  handleShuffle: () => void;
  testimonial: string;
  position: CardPosition;
  /** Optional — kept for API compatibility; avatar comes from `image`. */
  id?: number;
  author: string;
  image?: string | null;
}

function clientXOf(e: MouseEvent | TouchEvent | PointerEvent): number {
  if ("clientX" in e) return e.clientX;
  const touch = e.changedTouches[0] ?? e.touches[0];
  return touch ? touch.clientX : 0;
}

export function TestimonialCard({
  handleShuffle,
  testimonial,
  position,
  author,
  image,
}: TestimonialCardProps) {
  const dragRef = React.useRef(0);
  const isFront = position === "front";

  return (
    <motion.div
      style={{
        zIndex: position === "front" ? 2 : position === "middle" ? 1 : 0,
      }}
      animate={{
        rotate: position === "front" ? "-6deg" : position === "middle" ? "0deg" : "6deg",
        x: position === "front" ? "0%" : position === "middle" ? "33%" : "66%",
      }}
      drag={isFront}
      dragElastic={0.35}
      dragListener={isFront}
      dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
      onDragStart={(e) => {
        dragRef.current = clientXOf(e);
      }}
      onDragEnd={(e) => {
        if (dragRef.current - clientXOf(e) > 150) {
          handleShuffle();
        }
        dragRef.current = 0;
      }}
      transition={{ duration: 0.35 }}
      className={`absolute left-0 top-0 grid h-[450px] w-[330px] select-none place-content-center space-y-6 rounded-3xl border border-border bg-card/70 p-8 shadow-2xl backdrop-blur-md sm:w-[350px] ${
        isFront ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={`${author}`}
          draggable={false}
          loading="lazy"
          className="pointer-events-none mx-auto h-28 w-28 rounded-full border border-border bg-secondary object-cover"
        />
      ) : (
        <div className="pointer-events-none mx-auto grid h-28 w-28 place-items-center rounded-full border border-primary/30 bg-primary/10 font-display text-3xl font-bold text-primary">
          {author.charAt(0)}
        </div>
      )}
      <span className="text-center text-lg italic leading-relaxed text-muted-foreground">&ldquo;{testimonial}&rdquo;</span>
      <span className="text-center text-sm font-semibold text-primary">{author}</span>
    </motion.div>
  );
}
