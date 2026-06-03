import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy } from "@/lib/brand-content";
import { SACOCHE } from "@/lib/product";
import { formatMoney } from "@/lib/utils";

/** Best-seller spotlight: routes from the brand home to the hero product (/sacoche). */
export function HeroProductSpotlight({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).spotlight;
  return (
    <section className="bg-[var(--color-primary-50)] py-20">
      <div className="container-page grid items-center gap-10 md:grid-cols-2">
        <Reveal className="relative order-1 aspect-[4/3] overflow-hidden rounded-3xl md:order-none">
          <Image
            src="/hero.jpg"
            alt={c.heading}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          <span className="absolute left-4 top-4 rounded-full bg-[var(--color-secondary-500)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            {c.eyebrow}
          </span>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex items-center gap-2">
            <span className="flex" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(SACOCHE.rating)
                      ? "fill-[var(--color-accent-400)] text-[var(--color-accent-400)]"
                      : "fill-transparent text-[var(--color-border)]"
                  }`}
                />
              ))}
            </span>
            <span className="text-sm text-[var(--color-muted)]">
              {SACOCHE.rating}/5
            </span>
          </div>

          <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
          <p className="mt-3 max-w-md text-[var(--color-muted)]">{c.sub}</p>

          <ul className="mt-6 space-y-2.5">
            {c.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary-600)]" aria-hidden />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <span className="font-display text-3xl font-bold tabular-nums">
              {formatMoney(SACOCHE.priceCents, SACOCHE.currency, locale)}
            </span>
            <Link
              href="/sacoche"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary-600)] px-7 py-3 font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            >
              {c.cta}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
