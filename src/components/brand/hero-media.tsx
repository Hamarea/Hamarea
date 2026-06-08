"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { HomeHeroMedia } from "@/lib/queries";

/**
 * Admin-driven hero background: a single photo, an auto-rotating photo
 * slideshow, or a looping muted video. Pure background layer (absolute fill) —
 * the text + CTAs are overlaid by <BrandHero>. Falls back to /hero.jpg.
 */
export function HeroMedia({ media }: { media: HomeHeroMedia }) {
  if (media.type === "video" && media.videoUrl) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        poster={media.poster}
        aria-hidden
      >
        <source src={media.videoUrl} />
      </video>
    );
  }

  const images = media.images.length > 0 ? media.images : ["/hero.jpg"];
  if (media.type === "slideshow" && images.length > 1) {
    return <Slideshow images={images} />;
  }

  return (
    <Image
      src={images[0]}
      alt=""
      fill
      priority
      sizes="100vw"
      className="object-cover"
    />
  );
}

function Slideshow({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <>
      {images.map((src, i) => (
        <Image
          key={`${src}-${i}`}
          src={src}
          alt=""
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
}
