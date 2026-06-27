"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

/**
 * GradualBlur — React Bits (https://reactbits.dev). Stacks several backdrop-blur
 * layers behind a graduated mask to fade content into a soft, polished blur at an
 * edge. Ported to TypeScript; styles self-inject (no separate CSS file).
 */

export interface GradualBlurProps {
  position?: "top" | "bottom" | "left" | "right";
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  curve?: "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
  opacity?: number;
  animated?: boolean | "scroll";
  duration?: string;
  easing?: string;
  hoverIntensity?: number;
  target?: "parent" | "page";
  preset?: string;
  responsive?: boolean;
  zIndex?: number;
  onAnimationComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  // allow responsive mobile*/tablet*/desktop* overrides
  [key: string]: unknown;
}

const DEFAULT_CONFIG: GradualBlurProps = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
};

const PRESETS: Record<string, GradualBlurProps> = {
  top: { position: "top", height: "6rem" },
  bottom: { position: "bottom", height: "6rem" },
  left: { position: "left", height: "6rem" },
  right: { position: "right", height: "6rem" },
  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
  smooth: { height: "8rem", curve: "bezier", divCount: 10 },
  sharp: { height: "5rem", curve: "linear", divCount: 4 },
  header: { position: "top", height: "8rem", curve: "ease-out" },
  footer: { position: "bottom", height: "8rem", curve: "ease-out" },
};

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (...configs: GradualBlurProps[]): GradualBlurProps =>
  configs.reduce((acc, c) => ({ ...acc, ...c }), {} as GradualBlurProps);

const getGradientDirection = (position: string) =>
  ({ top: "to top", bottom: "to bottom", left: "to left", right: "to right" })[position] || "to bottom";

const debounce = <T extends unknown[]>(fn: (...a: T) => void, wait: number) => {
  let t: ReturnType<typeof setTimeout>;
  return (...a: T) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), wait);
  };
};

const useIntersectionObserver = (ref: React.RefObject<HTMLElement | null>, shouldObserve = false) => {
  const [isVisible, setIsVisible] = useState(!shouldObserve);
  useEffect(() => {
    if (!shouldObserve || !ref.current) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(!!entry?.isIntersecting), { threshold: 0.1 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);
  return isVisible;
};

function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo(() => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset]! : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, props);
  }, [props]);

  const isVisible = useIntersectionObserver(containerRef, config.animated === "scroll");

  const blurDivs = useMemo(() => {
    const divs: React.ReactNode[] = [];
    const divCount = config.divCount ?? 5;
    const increment = 100 / divCount;
    const baseStrength = config.strength ?? 2;
    const currentStrength = isHovered && config.hoverIntensity ? baseStrength * config.hoverIntensity : baseStrength;
    const curveFunc = CURVE_FUNCTIONS[config.curve ?? "linear"] || CURVE_FUNCTIONS.linear!;

    for (let i = 1; i <= divCount; i++) {
      const progress = curveFunc(i / divCount);
      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * currentStrength
        : 0.0625 * (progress * divCount + 1) * currentStrength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(config.position ?? "bottom");
      const divStyle: React.CSSProperties = {
        position: "absolute",
        inset: 0,
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
        transition:
          config.animated && config.animated !== "scroll"
            ? `backdrop-filter ${config.duration} ${config.easing}`
            : undefined,
      };
      divs.push(<div key={i} style={divStyle} />);
    }
    return divs;
  }, [config, isHovered]);

  const containerStyle = useMemo<React.CSSProperties>(() => {
    const isVertical = ["top", "bottom"].includes(config.position ?? "bottom");
    const isHorizontal = ["left", "right"].includes(config.position ?? "");
    const isPageTarget = config.target === "page";
    const zIndex = config.zIndex ?? 1000;

    const base: React.CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? zIndex + 100 : zIndex,
      ...config.style,
    };

    if (isVertical) {
      base.height = config.height;
      base.width = config.width || "100%";
      base[config.position as "top" | "bottom"] = 0;
      base.left = 0;
      base.right = 0;
    } else if (isHorizontal) {
      base.width = config.width || config.height;
      base.height = "100%";
      base[config.position as "left" | "right"] = 0;
      base.top = 0;
      base.bottom = 0;
    }
    return base;
  }, [config, isVisible]);

  const { hoverIntensity, animated, onAnimationComplete, duration } = config;
  useEffect(() => {
    if (isVisible && animated === "scroll" && onAnimationComplete) {
      const ms = parseFloat(duration ?? "0.3s") * 1000;
      const t = setTimeout(() => onAnimationComplete(), ms);
      return () => clearTimeout(t);
    }
  }, [isVisible, animated, onAnimationComplete, duration]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${config.target === "page" ? "gradual-blur-page" : "gradual-blur-parent"} ${config.className ?? ""}`}
      style={containerStyle}
      onMouseEnter={hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="gradual-blur-inner" style={{ position: "relative", width: "100%", height: "100%" }}>
        {blurDivs}
      </div>
    </div>
  );
}

const GradualBlurMemo = React.memo(GradualBlur);
GradualBlurMemo.displayName = "GradualBlur";
export default GradualBlurMemo;

const injectStyles = () => {
  if (typeof document === "undefined") return;
  const id = "gradual-blur-styles";
  if (document.getElementById(id)) return;
  const el = document.createElement("style");
  el.id = id;
  el.textContent = `
  .gradual-blur { pointer-events: none; transition: opacity 0.3s ease-out; isolation: isolate; }
  .gradual-blur-parent { overflow: hidden; }
  .gradual-blur-inner { pointer-events: none; position: relative; width: 100%; height: 100%; }
  .gradual-blur-inner > div { -webkit-backdrop-filter: inherit; backdrop-filter: inherit; }
  @supports not (backdrop-filter: blur(1px)) {
    .gradual-blur-inner > div { background: rgba(0,0,0,0.1); }
  }`;
  document.head.appendChild(el);
};

if (typeof document !== "undefined") injectStyles();
