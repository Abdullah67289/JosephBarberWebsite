"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import styles from "./FlowingMenu.module.css";

export interface FlowingMenuItem {
  link: string;
  text: string;
  image: string;
}

export interface FlowingMenuProps {
  items?: FlowingMenuItem[];
  speed?: number;
  textColor?: string;
  bgColor?: string;
  marqueeBgColor?: string;
  marqueeTextColor?: string;
  borderColor?: string;
}

export function FlowingMenu({
  items = [],
  speed = 15,
  textColor = "#fff",
  bgColor = "#120F17",
  marqueeBgColor = "#fff",
  marqueeTextColor = "#120F17",
  borderColor = "#fff",
}: FlowingMenuProps) {
  return (
    <div className={styles.menuWrap} style={{ backgroundColor: bgColor }}>
      <nav className={styles.menu} aria-label="Barbershop craft menu">
        {items.map((item, idx) => (
          <MenuItem
            key={`${item.text}-${idx}`}
            {...item}
            speed={speed}
            textColor={textColor}
            marqueeBgColor={marqueeBgColor}
            marqueeTextColor={marqueeTextColor}
            borderColor={borderColor}
          />
        ))}
      </nav>
    </div>
  );
}

type MenuItemProps = FlowingMenuItem &
  Required<Pick<FlowingMenuProps, "speed" | "textColor" | "marqueeBgColor" | "marqueeTextColor" | "borderColor">>;

function MenuItem({ link, text, image, speed, textColor, marqueeBgColor, marqueeTextColor, borderColor }: MenuItemProps) {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const marqueeRef = useRef<HTMLDivElement | null>(null);
  const marqueeInnerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const [repetitions, setRepetitions] = useState(4);

  const animationDefaults = { duration: 0.6, ease: "expo" };

  const distMetric = (x: number, y: number, x2: number, y2: number) => {
    const dx = x - x2;
    const dy = y - y2;
    return dx * dx + dy * dy;
  };
  const findClosestEdge = (mouseX: number, mouseY: number, width: number, height: number) =>
    distMetric(mouseX, mouseY, width / 2, 0) < distMetric(mouseX, mouseY, width / 2, height) ? "top" : "bottom";

  // Repeat the content enough times to fill the row for a seamless loop.
  useEffect(() => {
    const calculateRepetitions = () => {
      const marqueeContent = marqueeInnerRef.current?.querySelector<HTMLElement>(`.${styles.marqueePart}`);
      const contentWidth = marqueeContent?.offsetWidth ?? 0;
      if (!contentWidth) return;
      const needed = Math.ceil(window.innerWidth / contentWidth) + 2;
      setRepetitions(Math.max(4, needed));
    };
    calculateRepetitions();
    window.addEventListener("resize", calculateRepetitions);
    return () => window.removeEventListener("resize", calculateRepetitions);
  }, [text, image]);

  // Continuous horizontal marquee — animates exactly one content width for a
  // seamless, always-on loop (runs whether or not the row is revealed).
  useEffect(() => {
    const setupMarquee = () => {
      const inner = marqueeInnerRef.current;
      const marqueeContent = inner?.querySelector<HTMLElement>(`.${styles.marqueePart}`);
      const contentWidth = marqueeContent?.offsetWidth ?? 0;
      if (!inner || !contentWidth) return;
      animationRef.current?.kill();
      gsap.set(inner, { x: 0 });
      animationRef.current = gsap.to(inner, {
        x: -contentWidth,
        duration: speed,
        ease: "none",
        repeat: -1,
      });
    };
    const timer = window.setTimeout(setupMarquee, 80);
    return () => {
      window.clearTimeout(timer);
      animationRef.current?.kill();
      animationRef.current = null;
    };
  }, [text, image, repetitions, speed]);

  const reveal = (edge: "top" | "bottom") => {
    if (!marqueeRef.current || !marqueeInnerRef.current) return;
    gsap
      .timeline({ defaults: animationDefaults })
      .set(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .set(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0)
      .to([marqueeRef.current, marqueeInnerRef.current], { y: "0%" }, 0);
  };
  const hide = (edge: "top" | "bottom") => {
    if (!marqueeRef.current || !marqueeInnerRef.current) return;
    gsap
      .timeline({ defaults: animationDefaults })
      .to(marqueeRef.current, { y: edge === "top" ? "-101%" : "101%" }, 0)
      .to(marqueeInnerRef.current, { y: edge === "top" ? "101%" : "-101%" }, 0);
  };

  const handleMouseEnter = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    reveal(findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height));
  };
  const handleMouseLeave = (ev: React.MouseEvent<HTMLAnchorElement>) => {
    if (!itemRef.current) return;
    const rect = itemRef.current.getBoundingClientRect();
    hide(findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height));
  };

  return (
    <div className={styles.menuItem} ref={itemRef} style={{ borderColor }} data-flowing-menu-item={text}>
      <a
        className={styles.menuItemLink}
        href={link}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => reveal("bottom")}
        onBlur={() => hide("bottom")}
        style={{ color: textColor }}
      >
        <span className={styles.menuItemLinkText}>{text}</span>
      </a>
      <div className={styles.marquee} ref={marqueeRef} style={{ backgroundColor: marqueeBgColor }}>
        <div className={styles.marqueeInnerWrap}>
          <div className={styles.marqueeInner} ref={marqueeInnerRef} aria-hidden="true">
            {Array.from({ length: repetitions }).map((_, idx) => (
              <div className={styles.marqueePart} key={idx} style={{ color: marqueeTextColor }}>
                <span className={styles.marqueeText}>{text}</span>
                <div className={styles.marqueeImg} style={{ backgroundImage: `url(${image})` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlowingMenu;
