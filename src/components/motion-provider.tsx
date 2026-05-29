"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Loads only the `domAnimation` feature set (animations, variants, exit,
 * gestures, whileInView) for the lightweight `m` components — dropping the
 * layout + drag projection code that the full `motion` import pulls in.
 * `strict` throws if a full `motion.*` component is used, keeping the bundle lean.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
