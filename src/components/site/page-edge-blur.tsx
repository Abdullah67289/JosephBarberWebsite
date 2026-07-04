"use client";

import * as React from "react";
import GradualBlur from "@/components/animations/GradualBlur";

/**
 * The page-level GradualBlur softens whatever scrolls under the bottom edge —
 * but at the very end of the page it would permanently obscure the footer.
 * This wrapper fades the blur out over the last ~360px of scroll so the page
 * end is fully readable, and brings it back as soon as you scroll up.
 */
const FADE_DISTANCE = 360; // px of remaining scroll over which the blur fades
const GONE_AT = 120; // px from the bottom where the blur is fully gone

export function PageEdgeBlur() {
  const [opacity, setOpacity] = React.useState(1);

  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      const t = (remaining - GONE_AT) / (FADE_DISTANCE - GONE_AT);
      setOpacity(Math.min(1, Math.max(0, t)));
    };
    const onScroll = () => {
      // rAF is paused in hidden/occluded tabs — update synchronously there so
      // the state is correct the moment the tab becomes visible again.
      if (document.hidden) {
        update();
        return;
      }
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    // Opacity lives on this wrapper: GradualBlur memoizes its container style,
    // so style-prop updates after mount would be ignored.
    <div aria-hidden style={{ opacity, transition: "opacity 250ms ease-out" }}>
      <GradualBlur
        target="page"
        position="bottom"
        height="6rem"
        strength={2}
        divCount={5}
        curve="bezier"
        exponential
        opacity={1}
        style={{ zIndex: 20, pointerEvents: "none" }}
      />
    </div>
  );
}
