"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 0.61, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Vertical offset (px) to rise from. */
  y?: number;
  /** Fraction of the element that must be visible to trigger. */
  amount?: number;
  as?: "div" | "li" | "section" | "span";
};

/**
 * Scroll-reveal wrapper. Animates opacity + transform only (GPU, no layout
 * shift → CLS-safe), fires once, and fully bypasses animation when the user
 * prefers reduced motion. A Server Component can render this and pass
 * server-rendered children through.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  amount = 0.2,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const initial = { opacity: 0, y };
  const whileInView = { opacity: 1, y: 0 };
  const viewport = { once: true, amount } as const;
  const transition = { duration: 0.6, delay, ease: EASE };

  switch (as) {
    case "li":
      return (
        <motion.li className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
          {children}
        </motion.li>
      );
    case "section":
      return (
        <motion.section className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
          {children}
        </motion.section>
      );
    case "span":
      return (
        <motion.span className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
          {children}
        </motion.span>
      );
    default:
      return (
        <motion.div className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>
          {children}
        </motion.div>
      );
  }
}
