import Image from "next/image";
import { Instagram, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { getBrandCopy } from "@/lib/brand-content";

/**
 * Community / UGC strip. Uses the available product imagery as placeholder
 * tiles; swap for real customer photos/reels once a UGC source is wired
 * (see docs gap analysis M15). Each tile links out to social.
 */
const TILES = [
  { src: "/hero.jpg", alt: "" },
  { src: "/colors/rose.jpg", alt: "" },
  { src: "/colors/noir.jpg", alt: "" },
  { src: "/colors/blanc.jpg", alt: "" },
];

export function Community({ locale }: { locale: string }) {
  const c = getBrandCopy(locale).community;
  return (
    <section className="container-page py-20">
      <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <span className="brand-eyebrow text-[var(--color-primary-600)]">{c.eyebrow}</span>
          <h2 className="mt-3 font-display text-3xl md:text-5xl">{c.heading}</h2>
          <p className="mt-3 text-[var(--color-muted)]">{c.sub}</p>
        </div>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold transition-colors hover:bg-[var(--color-primary-50)]"
        >
          <Instagram className="h-4 w-4" /> {c.cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </Reveal>

      <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((t, i) => (
          <Reveal as="li" key={t.src} delay={i * 0.06}>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-2xl"
            >
              <Image
                src={t.src}
                alt={t.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-[var(--color-primary-900)]/0 transition-colors group-hover:bg-[var(--color-primary-900)]/30" />
              <span className="absolute bottom-3 left-3 flex items-center gap-1.5 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Instagram className="h-4 w-4" /> @hamarea
              </span>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
