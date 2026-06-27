"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import Masonry, { type MasonryItem } from "@/components/ui/masonry";
import type { GalleryItem } from "@/components/site/gallery-grid";
import { shouldOptimizeImage } from "@/lib/image";

/**
 * GalleryMasonry — the /gallery page layout. Renders the GSAP Masonry grid and
 * keeps a click-to-zoom lightbox (clicking a tile opens it in an overlay rather
 * than a new browser tab).
 */

// The gallery records store no image dimensions, so we cycle a set of varied
// heights to give the masonry its staggered rhythm (deterministic → SSR-safe).
const HEIGHTS = [560, 420, 660, 380, 600, 460, 520, 700, 440];

export function GalleryMasonry({ images }: { images: GalleryItem[] }) {
  const [active, setActive] = React.useState<GalleryItem | null>(null);

  const byId = React.useMemo(() => new Map(images.map((g) => [g.id, g])), [images]);
  const items = React.useMemo<MasonryItem[]>(
    () =>
      images.map((g, i) => ({
        id: g.id,
        img: g.url,
        url: g.url,
        height: HEIGHTS[i % HEIGHTS.length]!,
      })),
    [images],
  );

  return (
    <>
      <Masonry
        items={items}
        animateFrom="bottom"
        duration={0.9}
        stagger={0.05}
        scaleOnHover
        hoverScale={0.96}
        blurToFocus
        onItemClick={(it) => setActive(byId.get(it.id) ?? null)}
      />

      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <button
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative h-[85vh] w-full max-w-5xl animate-in zoom-in-95 duration-200"
          >
            <Image
              src={active.url}
              alt={active.alt ?? active.title ?? ""}
              fill
              sizes="100vw"
              unoptimized={!shouldOptimizeImage(active.url)}
              className="rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default GalleryMasonry;
