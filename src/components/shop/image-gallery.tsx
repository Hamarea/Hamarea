"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type GalleryImage = { url: string; alt: string };

export function ImageGallery({
  images,
  fallbackAlt,
}: {
  images: GalleryImage[];
  fallbackAlt: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--color-bg)]">
        <div className="absolute inset-0 grid place-items-center text-[var(--color-muted)]">
          {fallbackAlt}
        </div>
      </div>
    );
  }

  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse md:gap-4">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl bg-[var(--color-bg)]">
        <Image
          src={main.url}
          alt={main.alt || fallbackAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div
          role="tablist"
          aria-label="Images"
          className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto"
        >
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === active
                  ? "border-[var(--color-primary-600)]"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `${fallbackAlt} ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
