"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

/**
 * Stepper −/+ around a number input. The input keeps its `name`, so the parent
 * (server-action) form submits it normally — the buttons just nudge the value
 * for fast one-tap adjustments.
 */
export function QuantityStepper({
  name,
  defaultValue,
  min = 0,
  className,
}: {
  name: string;
  defaultValue: number;
  min?: number;
  className?: string;
}) {
  const [value, setValue] = useState<number>(defaultValue);
  const clamp = (n: number) => Math.max(min, Number.isFinite(n) ? n : min);

  return (
    <div className={`inline-flex items-stretch overflow-hidden rounded-md border border-[var(--color-border)] ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v - 1))}
        aria-label="Diminuer"
        className="grid w-9 place-items-center bg-[var(--color-bg)] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        name={name}
        type="number"
        min={min}
        value={value}
        onChange={(e) => setValue(clamp(parseInt(e.target.value, 10)))}
        className="w-16 border-x border-[var(--color-border)] bg-white px-2 py-2 text-center text-sm tabular-nums focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setValue((v) => clamp(v + 1))}
        aria-label="Augmenter"
        className="grid w-9 place-items-center bg-[var(--color-bg)] text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)]"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
