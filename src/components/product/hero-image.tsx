"use client";

import Image from "next/image";
import { useSelectedColor_current } from "@/stores/selected-color";

/**
 * Single LCP image. We render only the currently selected colour instead of
 * mounting all three (which previously triggered three full-bleed downloads).
 * `priority` preloads it as the Largest Contentful Paint element.
 */
export function HeroImage() {
  const color = useSelectedColor_current();

  return (
    <Image
      key={color.id}
      src={color.imageUrl}
      alt={`Sacoche étanche Hamarea — ${color.name}`}
      fill
      priority
      sizes="100vw"
      className="object-cover object-center"
    />
  );
}
