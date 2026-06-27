"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, Sparkles } from "lucide-react";
import type { TeamMember } from "@/components/site/team-card";
import { shouldOptimizeImage } from "@/lib/image";

export function BarberSpotlight({ member }: { member: TeamMember }) {
  const ref = React.useRef<HTMLDivElement>(null);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    node.style.setProperty("--spot-x", `${x}%`);
    node.style.setProperty("--spot-y", `${y}%`);
    node.style.setProperty("--tilt-x", `${(50 - y) / 14}deg`);
    node.style.setProperty("--tilt-y", `${(x - 50) / 18}deg`);
  }

  function resetTilt() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={ref}
      className="barber-spotlight group"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
    >
      <div className="barber-spotlight-glow" aria-hidden />
      <div className="barber-spotlight-card">
        <div className="barber-spotlight-image">
          {member.photoUrl ? (
            <Image
              src={member.photoUrl}
              alt={member.name}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              unoptimized={!shouldOptimizeImage(member.photoUrl)}
              className="object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center font-display text-7xl text-muted-foreground/30">
              {member.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="barber-spotlight-copy">
          <span className="eyebrow mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Chair spotlight
          </span>
          <h3>{member.name}</h3>
          <p className="text-primary">{member.title}</p>
          {member.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>}
          <Link href={`/book?barber=${member.slug}`} className="barber-spotlight-action">
            <CalendarCheck className="h-4 w-4" />
            Book with {member.name.split(" ")[0]}
          </Link>
        </div>
      </div>
    </div>
  );
}
