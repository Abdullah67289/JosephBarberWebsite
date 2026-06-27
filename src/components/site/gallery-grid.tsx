"use client";

import * as React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { shouldOptimizeImage } from "@/lib/image";

export interface GalleryItem {
  id: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  title?: string | null;
}

export function GalleryGrid({ images }: { images: GalleryItem[] }) {
  const [active, setActive] = React.useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((img, index) => (
          <button
            key={img.id}
            onClick={() => setActive(img)}
            className={`premium-card group relative block w-full text-left animate-fade-up ${index % 5 === 0 ? "sm:row-span-2" : ""}`}
            style={{ animationDelay: `${Math.min(index * 0.04, 0.28)}s` }}
          >
            <span className={`premium-image relative block ${index % 5 === 0 ? "aspect-[4/5] sm:h-full" : "aspect-[4/3]"}`}>
              <Image
                src={img.url}
                alt={img.alt ?? "Gallery image"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                loading="lazy"
                unoptimized={!shouldOptimizeImage(img.url)}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-95" />
            {img.caption && (
              <span className="absolute bottom-3 left-3 text-sm font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>

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
