"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { LoginForm } from "@/components/admin/login-form";
import type { LoginMood } from "@/components/admin/login-atelier-panel";

export function StaffLoginExperience({
  businessName,
  next,
  devBypassEnabled,
  showTestCreds,
  signupEnabled,
}: {
  businessName: string;
  next?: string;
  devBypassEnabled: boolean;
  showTestCreds: boolean;
  signupEnabled: boolean;
}) {
  const [mood, setMood] = useState<LoginMood>("idle");
  const shouldReduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-280, 280], [8, -8]);
  const rotateY = useTransform(mouseX, [-280, 280], [-8, 8]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <main className="theme-cream relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-12%,hsl(var(--primary)/0.16),transparent_46%)]" />
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-soft-light"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.7%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          backgroundSize: "220px 220px",
        }}
        aria-hidden
      />
      <div className="barber-galaxy absolute inset-0 opacity-[0.12]" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[25rem]"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="group relative"
          style={{ rotateX: shouldReduceMotion ? 0 : rotateX, rotateY: shouldReduceMotion ? 0 : rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            className="absolute -inset-1 rounded-[1.4rem] bg-primary/10 blur-2xl"
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    opacity: [0.25, 0.5, 0.25],
                    scale: [0.98, 1.03, 0.98],
                  }
            }
            transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          <div className="absolute -inset-px overflow-hidden rounded-[1.35rem]" aria-hidden>
            <motion.div
              className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-gold-200 to-transparent"
              animate={shouldReduceMotion ? undefined : { left: ["-50%", "100%"], opacity: [0.2, 0.9, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.75, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute right-0 top-0 h-1/2 w-px bg-gradient-to-b from-transparent via-gold-200 to-transparent"
              animate={shouldReduceMotion ? undefined : { top: ["-50%", "100%"], opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.75, delay: 0.55, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 right-0 h-px w-1/2 bg-gradient-to-r from-transparent via-gold-200 to-transparent"
              animate={shouldReduceMotion ? undefined : { right: ["-50%", "100%"], opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.75, delay: 1.1, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 left-0 h-1/2 w-px bg-gradient-to-b from-transparent via-gold-200 to-transparent"
              animate={shouldReduceMotion ? undefined : { bottom: ["-50%", "100%"], opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 0.75, delay: 1.65, ease: "easeInOut" }}
            />
          </div>

          <section className="relative overflow-hidden rounded-[1.35rem] border border-primary/25 bg-card/75 p-6 shadow-[0_36px_90px_-48px_rgb(0_0_0/0.45),inset_0_1px_0_hsl(0_0%_100%/0.18)] backdrop-blur-2xl sm:p-7">
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)",
                backgroundSize: "30px 30px",
              }}
              aria-hidden
            />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent" aria-hidden />

            <div className="relative">
              <Link href="/" className="mx-auto mb-5 flex w-fit items-center gap-2.5">
                <motion.span
                  initial={{ scale: 0.72, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", duration: 0.75 }}
                  className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-primary/35 shadow-[0_0_34px_-12px_hsl(var(--primary)/0.9)]"
                >
                  <span className="absolute inset-0 barber-pole opacity-80" aria-hidden />
                  <span className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent" aria-hidden />
                  <span className="relative z-10 font-display text-sm font-bold text-background">JM</span>
                </motion.span>
                <span className="font-display text-lg font-bold text-foreground">{businessName}</span>
              </Link>

              <div className="mb-6 text-center">
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="eyebrow mb-3 justify-center"
                >
                  Staff portal
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="font-display text-3xl font-bold"
                >
                  Welcome back
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.32 }}
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  Sign in to manage bookings, schedules, services, shop stock, and website content.
                </motion.p>
              </div>

              <LoginForm
                next={next}
                devBypassEnabled={devBypassEnabled}
                showTestCreds={showTestCreds}
                onMoodChange={setMood}
              />

              <p className="mt-6 text-center text-xs text-muted-foreground">
                <Link href="/" className="transition-colors hover:text-primary">
                  Back to website
                </Link>
              </p>
            </div>
          </section>
        </motion.div>
      </motion.div>
    </main>
  );
}
