"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { getProductCopy } from "@/lib/product-content";
import { Reveal } from "@/components/ui/reveal";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const copy = getProductCopy(useLocale()).faq;

  return (
    <section id="faq" className="container-page max-w-3xl py-16 md:py-20 scroll-mt-20">
      <Reveal className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">{copy.heading}</h2>
      </Reveal>

      <ul className="mt-10 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
        {copy.items.map((f, i) => {
          const isOpen = open === i;
          const panelInner = (
            <div className="px-5 pb-5 text-sm text-[var(--color-muted)]">{f.a}</div>
          );
          return (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg)]/50"
              >
                <span className="font-medium">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {reduce ? (
                isOpen && (
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                  >
                    {panelInner}
                  </div>
                )
              ) : (
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <m.div
                      id={`faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`faq-trigger-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {panelInner}
                    </m.div>
                  )}
                </AnimatePresence>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
