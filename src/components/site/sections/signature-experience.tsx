"use client";

import Image from "next/image";
import CardSwap, { Card } from "@/components/animations/CardSwap";
import { shouldOptimizeImage } from "@/lib/image";

export interface ExperienceCard {
  title: string;
  description: string;
  image: string;
}

export function SignatureExperience({ cards }: { cards: ExperienceCard[] }) {
  if (cards.length === 0) return null;
  return (
    <div className="relative h-[340px] w-full overflow-hidden sm:h-[400px]">
      <CardSwap
        width={330}
        height={224}
        cardDistance={46}
        verticalDistance={56}
        delay={4200}
        skewAmount={5}
        pauseOnHover
      >
        {cards.map((card) => (
          <Card key={card.title}>
            <div className="relative h-full w-full overflow-hidden rounded-[12px]">
              {card.image && (
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="330px"
                  unoptimized={!shouldOptimizeImage(card.image)}
                  className="object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display text-lg font-bold text-white">{card.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-white/70">{card.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </CardSwap>
    </div>
  );
}
