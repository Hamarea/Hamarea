import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Chip = {
  label: string;
  href: ComponentProps<typeof Link>["href"];
  active: boolean;
  count?: number;
};

/**
 * One-click filter chips (server component) — quick segments for admin lists.
 * Active chip is filled; counts show as a subtle pill. Keeps everyday filtering
 * to a single tap instead of a select + submit.
 */
export function FilterChips({ items }: { items: Chip[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((c, i) => (
        <Link
          key={i}
          href={c.href}
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
            (c.active
              ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
              : "border-[var(--color-border)] bg-white text-[var(--color-foreground)] hover:bg-[var(--color-bg)]")
          }
        >
          {c.label}
          {typeof c.count === "number" && (
            <span
              className={
                "rounded-full px-1.5 text-[11px] tabular-nums " +
                (c.active ? "bg-white/20" : "bg-[var(--color-bg)] text-[var(--color-muted)]")
              }
            >
              {c.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
