"use client";

import Image from "next/image";
import { SACOCHE } from "@/lib/product";
import { useSelectedColor } from "@/stores/selected-color";

export function HeroImage() {
  const id = useSelectedColor((s) => s.id);

  return (
    <>
      {SACOCHE.colors.map((c) => (
        <Image
          key={c.id}
          src={c.imageUrl}
          alt={`Sacoche étanche Hamarea — ${c.name}`}
          fill
          priority={c.id === SACOCHE.colors[0].id}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-500 ${
            id === c.id ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </>
  );
}
