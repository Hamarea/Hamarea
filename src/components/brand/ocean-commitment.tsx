import { Waves, Recycle, Heart } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy } from "@/lib/brand-content";

const ICONS = [Waves, Recycle, Heart] as const;

/** Brand values & ocean pledge — credible, material-level (no vague claims). */
export function OceanCommitment({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).commitment;
  return (
    <section id="engagement" className="container-page scroll-mt-20 py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="brand-eyebrow text-[var(--color-primary-600)]">{c.eyebrow}</span>
        <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
        <p className="mt-3 text-[var(--color-muted)]">{c.sub}</p>
      </Reveal>

      <ul className="mt-12 grid gap-4 md:grid-cols-3">
        {c.items.map((item, i) => {
          const Icon = ICONS[i] ?? Waves;
          return (
            <Reveal
              as="li"
              key={item.title}
              delay={i * 0.08}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                {item.body}
              </p>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
