import { Waves } from "lucide-react";
import { getBrandCopy } from "@/lib/brand-content";

/** Infinite keyword marquee — brand energy band under the hero. */
export function BrandMarquee({ locale }: { locale: string }) {
  const items = getBrandCopy(locale).marquee;
  const row = [...items, ...items];
  return (
    <div className="border-y border-white/10 bg-[var(--color-primary-900)] py-3 text-white">
      <div className="marquee-mask overflow-hidden">
        <ul className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap">
          {row.map((t, i) => (
            <li
              key={i}
              className="flex items-center gap-8 text-sm font-semibold uppercase tracking-[0.18em]"
            >
              <span>{t}</span>
              <Waves
                aria-hidden
                className="h-4 w-4 text-[var(--color-primary-400)]"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
