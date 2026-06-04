"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Per-locale field editor. Renders one tab per language; inactive panels are
 * hidden with the `hidden` attribute (NOT unmounted), so every locale's inputs
 * stay in the DOM and are submitted together by the parent <form>.
 */
export function LangTabs({
  panels,
}: {
  panels: { code: string; label: string; node: ReactNode }[];
}) {
  const [active, setActive] = useState(panels[0]?.code ?? "fr");
  return (
    <div>
      <div role="tablist" className="mb-3 flex flex-wrap gap-1">
        {panels.map((p) => (
          <button
            key={p.code}
            type="button"
            role="tab"
            aria-selected={active === p.code}
            onClick={() => setActive(p.code)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              active === p.code
                ? "bg-[var(--color-primary-600)] text-white"
                : "bg-[var(--color-bg)] text-[var(--color-muted)] hover:bg-[var(--color-primary-50)]",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {panels.map((p) => (
        <div key={p.code} hidden={active !== p.code} className="space-y-3">
          {p.node}
        </div>
      ))}
    </div>
  );
}
