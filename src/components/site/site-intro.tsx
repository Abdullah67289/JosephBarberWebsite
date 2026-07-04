"use client";

import * as React from "react";
import { BrandMark } from "@/components/site/brand-mark";
import styles from "./site-intro.module.css";

const SEEN_KEY = "jm-intro-seen";

/**
 * A brief branded curtain reveal on first load. Shows once per browser session
 * (sessionStorage), plays with pure CSS so it appears before hydration, and
 * lifts away to reveal the page.
 */
export function SiteIntro({ businessName }: { businessName: string }) {
  const [show, setShow] = React.useState(false);
  // Ref guard so React 18 StrictMode's double-invoked effect doesn't cancel the
  // removal timer (its cleanup would clear a freshly-set timeout).
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;

    let seen = true;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(true);
    // Remove on a fixed timer rather than animationend — the OS reduced-motion
    // reset can fire animationend instantly, which would flash the overlay away.
    const t = window.setTimeout(() => setShow(false), 1400);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      data-site-intro
      className={`theme-cream ${styles.overlay}`}
      role="presentation"
    >
      <div className={styles.inner}>
        <BrandMark className="h-14 w-14" />
        <span className={styles.sweep} />
        <span className={styles.name}>{businessName}</span>
      </div>
    </div>
  );
}
