"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useInViewOnce<T extends HTMLElement>(once = true) {
  const ref = React.useRef<T>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { rootMargin: "-80px 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return { ref, visible };
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
  once?: boolean;
}) {
  const { ref, visible } = useInViewOnce<HTMLElement>(once);
  const Tag = as;

  return (
    <Tag
      ref={ref as React.Ref<any>}
      className={cn("reveal-motion", visible && "is-visible", className)}
      style={
        {
          "--reveal-delay": `${delay}s`,
          "--reveal-y": `${y}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useInViewOnce<HTMLDivElement>(true);
  return (
    <div
      ref={ref}
      className={cn("stagger-group", visible && "is-visible", className)}
    >
      {children}
    </div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("stagger-item", className)}>
      {children}
    </div>
  );
}
