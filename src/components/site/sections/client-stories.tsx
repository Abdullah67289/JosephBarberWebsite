"use client";

import * as React from "react";
import { TestimonialCard, type CardPosition } from "@/components/ui/testimonial-cards";

export interface StoryTestimonial {
  id: number;
  testimonial: string;
  author: string;
  image?: string | null;
}

export function ClientStories({ testimonials }: { testimonials: StoryTestimonial[] }) {
  const cards = testimonials.slice(0, 3);
  const [positions, setPositions] = React.useState<CardPosition[]>(["front", "middle", "back"]);

  const handleShuffle = () => {
    setPositions((prev) => {
      const next = [...prev];
      const last = next.pop();
      if (last) next.unshift(last);
      return next;
    });
  };

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[460px] w-[330px] sm:w-[350px]">
        {cards.map((card, i) => (
          <TestimonialCard
            key={card.id}
            testimonial={card.testimonial}
            author={card.author}
            image={card.image}
            handleShuffle={handleShuffle}
            position={positions[i] ?? "back"}
          />
        ))}
      </div>
      {cards.length > 1 && (
        <p className="text-xs text-muted-foreground">Drag the top card aside to see the next review.</p>
      )}
    </div>
  );
}
