"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SACOCHE } from "@/lib/product";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="container-page max-w-3xl py-16 md:py-20 scroll-mt-20">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-primary-600)]">
          Questions fréquentes
        </p>
        <h2 className="mt-2 font-display text-3xl md:text-4xl">
          Tout ce qu&apos;il faut savoir.
        </h2>
      </div>

      <ul className="mt-10 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
        {SACOCHE.faq.map((f, i) => {
          const isOpen = open === i;
          return (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--color-bg)]/50"
              >
                <span className="font-medium">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm text-[var(--color-muted)]">
                  {f.a}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
