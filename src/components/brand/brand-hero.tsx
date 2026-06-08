import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { HeroMedia } from "@/components/brand/hero-media";
import { getBrandCopy } from "@/lib/brand-content";
import { getHomeHero } from "@/lib/queries";

/** Brand hero: identity + value prop + one primary CTA, viewable in <1 screen. */
export async function BrandHero({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).hero;
  const media = await getHomeHero();
  return (
    <section className="relative -mt-16 min-h-[100svh] w-full overflow-hidden bg-[var(--color-primary-900)] text-white">
      <HeroMedia media={media} />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-900)]/85 via-[var(--color-primary-900)]/55 to-[var(--color-secondary-900)]/40"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-primary-900)] to-transparent"
      />

      <div className="container-page relative z-10 flex min-h-[calc(100svh-4rem)] flex-col justify-center pt-24 pb-16 md:pt-28">
        <div className="max-w-3xl">
          <Reveal>
            <span className="brand-eyebrow text-[var(--color-primary-200)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-secondary-400)]" />
              {c.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-4 font-display text-[clamp(2.75rem,8vw,6rem)] font-black leading-[0.92] tracking-[-0.02em] drop-shadow-[0_4px_30px_rgba(0,0,0,0.45)]">
              {c.titleLine1}
              <br />
              <span className="text-[var(--color-primary-300)]">{c.titleLine2}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-5 max-w-xl text-base text-white/90 md:text-lg">
              {c.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sacoche"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-secondary-500)] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-black/20 transition-transform hover:scale-[1.03] active:scale-95"
              >
                {c.ctaPrimary}
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#waitlist"
                className="inline-flex min-h-12 items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold text-white ring-1 ring-white/40 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                {c.ctaSecondary}
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <a
        href="#univers"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-x-0 bottom-6 z-10 mx-auto hidden w-fit text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70 md:block"
      >
        ↓ {c.scroll}
      </a>
    </section>
  );
}
