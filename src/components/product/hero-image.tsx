"use client";

import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useSelectedColor_current } from "@/stores/selected-color";

/**
 * Single LCP image with a subtle scroll parallax. The image is slightly scaled
 * up so the upward drift never reveals an edge. Parallax is disabled for users
 * who prefer reduced motion.
 */
export function HeroImage() {
  const color = useSelectedColor_current();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 700], [0, 60]);

  if (reduce) {
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

  return (
    <motion.div className="absolute inset-0" style={{ y, scale: 1.18 }}>
      <Image
        key={color.id}
        src={color.imageUrl}
        alt={`Sacoche étanche Hamarea — ${color.name}`}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
    </motion.div>
  );
}
