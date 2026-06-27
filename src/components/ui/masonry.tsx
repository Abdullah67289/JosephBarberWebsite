"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { gsap } from "gsap";
import styles from "./masonry.module.css";

/**
 * Masonry — React Bits GSAP masonry grid, ported to TypeScript + CSS Modules.
 *
 * Adaptations for Next.js: SSR-safe `matchMedia`/`useLayoutEffect` guards, the
 * container height is derived from the computed grid (the original relies on a
 * fixed-height parent, which collapses in normal page flow), and an optional
 * `onItemClick` so the gallery can open a lightbox instead of a new browser tab.
 */
export interface MasonryItem {
  id: string;
  img: string;
  url: string;
  height: number;
}

type AnimateFrom = "top" | "bottom" | "left" | "right" | "center" | "random";

interface MasonryProps {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: AnimateFrom;
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
  colorShiftOnHover?: boolean;
  onItemClick?: (item: MasonryItem) => void;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLUMN_QUERIES = ["(min-width:1500px)", "(min-width:1000px)", "(min-width:600px)", "(min-width:400px)"];
const COLUMN_VALUES = [5, 4, 3, 2];

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const useMedia = (queries: string[], values: number[], defaultValue: number) => {
  const get = () => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") return defaultValue;
    const idx = queries.findIndex((q) => window.matchMedia(q).matches);
    return values[idx] ?? defaultValue;
  };
  const [value, setValue] = useState<number>(get);
  useEffect(() => {
    const mqls = queries.map((q) => window.matchMedia(q));
    const handler = () => setValue(get);
    mqls.forEach((mql) => mql.addEventListener("change", handler));
    return () => mqls.forEach((mql) => mql.removeEventListener("change", handler));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]);
  return value;
};

const useMeasure = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
};

const preloadImages = async (urls: string[]) => {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        }),
    ),
  );
};

export default function Masonry({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
  colorShiftOnHover = false,
  onItemClick,
}: MasonryProps) {
  const columns = useMedia(COLUMN_QUERIES, COLUMN_VALUES, 1);
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);

  const getInitialPosition = (item: GridItem) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction: AnimateFrom = animateFrom;
    if (animateFrom === "random") {
      const dirs: AnimateFrom[] = ["top", "bottom", "left", "right"];
      direction = dirs[Math.floor(Math.random() * dirs.length)] ?? "bottom";
    }

    switch (direction) {
      case "top":
        return { x: item.x, y: -200 };
      case "bottom":
        return { x: item.x, y: window.innerHeight + 200 };
      case "left":
        return { x: -200, y: item.y };
      case "right":
        return { x: window.innerWidth + 200, y: item.y };
      case "center":
        return { x: containerRect.width / 2 - item.w / 2, y: containerRect.height / 2 - item.h / 2 };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  };

  useEffect(() => {
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0) as number[];
    const columnWidth = width / columns;

    return items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      const h = child.height / 2;
      const y = colHeights[col] ?? 0;
      colHeights[col] = (colHeights[col] ?? 0) + h;
      return { ...child, x, y, w: columnWidth, h };
    });
  }, [columns, items, width]);

  const containerHeight = grid.length ? Math.max(...grid.map((i) => i.y + i.h)) : 0;

  const hasMounted = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!imagesReady) return;

    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animationProps = { x: item.x, y: item.y, width: item.w, height: item.h };

      if (!hasMounted.current) {
        const initialPos = getInitialPosition(item);
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: initialPos.x,
            y: initialPos.y,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: "blur(10px)" }),
          },
          {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: "blur(0px)" }),
            duration: 0.8,
            ease: "power3.out",
            delay: index * stagger,
          },
        );
      } else {
        gsap.to(selector, { ...animationProps, duration, ease, overwrite: "auto" });
      }
    });

    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);

  const handleMouseEnter = (e: MouseEvent, item: GridItem) => {
    const selector = `[data-key="${item.id}"]`;
    if (scaleOnHover) gsap.to(selector, { scale: hoverScale, duration: 0.3, ease: "power2.out" });
    if (colorShiftOnHover) {
      const overlay = (e.currentTarget as HTMLElement).querySelector(`.${styles.colorOverlay}`);
      if (overlay) gsap.to(overlay, { opacity: 0.3, duration: 0.3 });
    }
  };

  const handleMouseLeave = (e: MouseEvent, item: GridItem) => {
    const selector = `[data-key="${item.id}"]`;
    if (scaleOnHover) gsap.to(selector, { scale: 1, duration: 0.3, ease: "power2.out" });
    if (colorShiftOnHover) {
      const overlay = (e.currentTarget as HTMLElement).querySelector(`.${styles.colorOverlay}`);
      if (overlay) gsap.to(overlay, { opacity: 0, duration: 0.3 });
    }
  };

  return (
    <div ref={containerRef} className={styles.list} style={{ height: containerHeight }}>
      {grid.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          className={styles.itemWrapper}
          onClick={() => (onItemClick ? onItemClick(item) : window.open(item.url, "_blank", "noopener"))}
          onMouseEnter={(e) => handleMouseEnter(e, item)}
          onMouseLeave={(e) => handleMouseLeave(e, item)}
        >
          <div className={styles.itemImg} style={{ backgroundImage: `url(${item.img})` }}>
            {colorShiftOnHover && <div className={styles.colorOverlay} />}
          </div>
        </div>
      ))}
    </div>
  );
}
