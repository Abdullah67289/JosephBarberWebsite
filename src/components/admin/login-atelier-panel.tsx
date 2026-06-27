"use client";

import * as React from "react";
import { CalendarCheck, Scissors, ShieldCheck, Sparkles } from "lucide-react";

export type LoginMood = "idle" | "typing" | "password" | "peek";

export function LoginAtelierPanel({ businessName, mood }: { businessName: string; mood: LoginMood }) {
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });
  const [blink, setBlink] = React.useState(false);

  React.useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return undefined;

    const handleMouseMove = (event: MouseEvent) => {
      setMouse({
        x: Math.max(-10, Math.min(10, (event.clientX - window.innerWidth / 2) / 80)),
        y: Math.max(-8, Math.min(8, (event.clientY - window.innerHeight / 2) / 90)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  const eyeX = mood === "password" ? -6 : mood === "peek" ? 7 : mouse.x;
  const eyeY = mood === "password" ? -4 : mood === "peek" ? 5 : mouse.y;
  const lean = mood === "typing" ? -7 : mood === "password" ? 6 : mouse.x / 2;

  return (
    <div className="relative hidden min-h-[720px] overflow-hidden rounded-[1.75rem] border border-primary/20 bg-card p-8 shadow-[0_34px_100px_-54px_hsl(var(--primary)/0.75)] lg:flex lg:flex-col">
      <div className="barber-galaxy opacity-35" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-primary/40">
            <span className="absolute inset-0 barber-pole opacity-85" aria-hidden />
            <span className="relative z-10 font-display text-sm font-bold text-background">JM</span>
          </span>
          <div>
            <p className="font-display text-lg font-bold">{businessName}</p>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Staff entrance</p>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary" />
      </div>

      <div className="relative z-10 mt-14 max-w-xl">
        <span className="eyebrow mb-4">After-hours control room</span>
        <h1 className="text-balance font-display text-5xl font-bold leading-none xl:text-6xl">
          Keep every chair running sharp.
        </h1>
        <p className="mt-5 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          Bookings, barbers, services, shop stock, reviews, and public website content all live behind this door.
        </p>
      </div>

      <div className="relative z-10 mt-auto flex min-h-[360px] items-end justify-center">
        <div className="relative h-[330px] w-[520px]">
          <Character
            className="left-8 h-[300px] w-[150px] rounded-t-[36px] bg-[#9b1f1f]"
            label="Bookings"
            color="#d4a72c"
            eyeX={eyeX}
            eyeY={eyeY}
            blink={blink}
            rotate={lean}
          />
          <Character
            className="left-[160px] h-[250px] w-[120px] rounded-t-[58px] bg-[#1d1b18]"
            label="Barbers"
            color="#f4d57a"
            eyeX={mood === "typing" ? 5 : eyeX / 1.4}
            eyeY={mood === "typing" ? 3 : eyeY / 1.4}
            blink={blink}
            rotate={-lean / 1.4}
          />
          <Character
            className="left-[260px] h-[315px] w-[150px] rounded-t-[18px] bg-[#c4902f]"
            label="Services"
            color="#120f0a"
            eyeX={mood === "peek" ? 8 : eyeX / 1.2}
            eyeY={mood === "peek" ? 4 : eyeY / 1.2}
            blink={blink}
            rotate={lean / 1.8}
          />
          <div className="absolute bottom-0 left-[382px] h-[185px] w-[116px] rounded-t-full bg-[#efe5c6] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform duration-500" style={{ transform: `skewX(${lean / 2}deg)` }}>
            <div className="absolute left-8 top-16 flex gap-5">
              <Pupil x={mood === "peek" ? -5 : eyeX / 1.6} y={mood === "peek" ? -4 : eyeY / 1.6} dark />
              <Pupil x={mood === "peek" ? -5 : eyeX / 1.6} y={mood === "peek" ? -4 : eyeY / 1.6} dark />
            </div>
            <div className="absolute left-8 top-[108px] h-1 w-16 rounded-full bg-[#1d1b18]" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-4 rounded-full bg-primary/30 blur-xl" aria-hidden />
        </div>
      </div>

      <div className="relative z-10 mt-8 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2 rounded-xl border border-border bg-background/35 p-3">
          <CalendarCheck className="h-4 w-4 text-primary" /> Live schedule
        </span>
        <span className="flex items-center gap-2 rounded-xl border border-border bg-background/35 p-3">
          <Scissors className="h-4 w-4 text-primary" /> Service menu
        </span>
        <span className="flex items-center gap-2 rounded-xl border border-border bg-background/35 p-3">
          <ShieldCheck className="h-4 w-4 text-primary" /> Owner safe
        </span>
      </div>
    </div>
  );
}

function Character({
  className,
  label,
  color,
  eyeX,
  eyeY,
  blink,
  rotate,
}: {
  className: string;
  label: string;
  color: string;
  eyeX: number;
  eyeY: number;
  blink: boolean;
  rotate: number;
}) {
  return (
    <div
      className={`absolute bottom-0 transition-transform duration-500 ${className}`}
      style={{ transform: `skewX(${rotate}deg)`, transformOrigin: "bottom center" }}
    >
      <div className="absolute left-1/2 top-12 flex -translate-x-1/2 gap-6">
        <EyeDot x={eyeX} y={eyeY} blink={blink} color={color} />
        <EyeDot x={eyeX} y={eyeY} blink={blink} color={color} />
      </div>
      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
        {label}
      </span>
    </div>
  );
}

function EyeDot({ x, y, blink, color }: { x: number; y: number; blink: boolean; color: string }) {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-white transition-all duration-150" style={{ height: blink ? 2 : 24 }}>
      {!blink && <span className="h-2.5 w-2.5 rounded-full transition-transform duration-100" style={{ background: color, transform: `translate(${x}px, ${y}px)` }} />}
    </span>
  );
}

function Pupil({ x, y, dark }: { x: number; y: number; dark?: boolean }) {
  return (
    <span
      className="block h-3 w-3 rounded-full transition-transform duration-100"
      style={{ background: dark ? "#1d1b18" : "#f4d57a", transform: `translate(${x}px, ${y}px)` }}
    />
  );
}
